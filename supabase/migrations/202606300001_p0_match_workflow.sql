create index if not exists matches_confirmed_played_idx
  on public.matches (season_id, status, played_at desc)
  where status = 'confirmed';

create index if not exists match_players_match_side_idx
  on public.match_players (match_id, side, user_id);

create or replace function private.validate_match_sets(
  p_mode public.match_mode,
  p_points_to_win smallint,
  p_best_of smallint,
  p_sets jsonb
)
returns public.match_side
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_set jsonb;
  v_a integer;
  v_b integer;
  v_a_wins integer := 0;
  v_b_wins integer := 0;
  v_required integer;
  v_number integer := 0;
begin
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception using errcode = '22023', message = 'sets_required';
  end if;

  if p_mode = 'ranked' then
    v_required := (p_best_of / 2) + 1;
    if jsonb_array_length(p_sets) > p_best_of then
      raise exception using errcode = '22023', message = 'too_many_sets';
    end if;
  end if;

  for v_set in select value from jsonb_array_elements(p_sets) loop
    v_number := v_number + 1;
    begin
      v_a := (v_set->>'sideAPoints')::integer;
      v_b := (v_set->>'sideBPoints')::integer;
    exception when others then
      raise exception using errcode = '22023', message = 'invalid_set_score';
    end;

    if v_a < 0 or v_b < 0 or v_a = v_b then
      raise exception using errcode = '22023', message = 'invalid_set_score';
    end if;

    if p_mode = 'ranked' and (
      greatest(v_a, v_b) < p_points_to_win
      or abs(v_a - v_b) <> 2 and greatest(v_a, v_b) <> p_points_to_win
      or (least(v_a, v_b) < p_points_to_win - 1 and greatest(v_a, v_b) <> p_points_to_win)
    ) then
      raise exception using errcode = '22023', message = 'invalid_ranked_set';
    end if;

    if v_a > v_b then v_a_wins := v_a_wins + 1; else v_b_wins := v_b_wins + 1; end if;

    if p_mode = 'ranked'
      and (v_a_wins = v_required or v_b_wins = v_required)
      and v_number < jsonb_array_length(p_sets) then
      raise exception using errcode = '22023', message = 'sets_after_match_winner';
    end if;
  end loop;

  if v_a_wins = v_b_wins then
    raise exception using errcode = '22023', message = 'sets_do_not_produce_winner';
  end if;
  if p_mode = 'ranked' and greatest(v_a_wins, v_b_wins) <> v_required then
    raise exception using errcode = '22023', message = 'insufficient_winning_sets';
  end if;

  return case when v_a_wins > v_b_wins then 'A'::public.match_side else 'B'::public.match_side end;
end;
$$;

create or replace function private.anti_farming_factor(p_matchup_number integer)
returns numeric language sql immutable set search_path = ''
as $$ select case when p_matchup_number <= 3 then 1 when p_matchup_number <= 6 then .5 else 0 end $$;

create or replace function private.submit_match_result_command(p_match_id uuid, p_sets jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_set jsonb;
  v_number integer := 0;
begin
  if v_user_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'match_not_found'; end if;
  if v_match.status <> 'ready' then raise exception using errcode = '55000', message = 'match_not_ready'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_user_id) then
    raise exception using errcode = '42501', message = 'not_a_participant';
  end if;

  perform private.validate_match_sets(v_match.mode, v_match.points_to_win, v_match.best_of, p_sets);
  delete from public.match_sets where match_id = p_match_id;
  for v_set in select value from jsonb_array_elements(p_sets) loop
    v_number := v_number + 1;
    insert into public.match_sets (match_id, set_number, side_a_points, side_b_points)
    values (p_match_id, v_number, (v_set->>'sideAPoints')::integer, (v_set->>'sideBPoints')::integer);
  end loop;

  update public.matches
  set status = 'submitted', submitted_by_user_id = v_user_id, played_at = now()
  where id = p_match_id;
  insert into public.match_events (match_id, user_id, type) values (p_match_id, v_user_id, 'submitted');
end;
$$;

create or replace function private.confirm_match_result_command(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_submitter_side public.match_side;
  v_confirmer_side public.match_side;
  v_winner public.match_side;
  v_kind public.rating_kind;
  v_sets jsonb;
  v_set_wins integer;
  v_loser_sets integer;
  v_winner_points integer;
  v_loser_points integer;
  v_set_factor numeric;
  v_point_factor numeric;
  v_format_factor numeric;
  v_anti_factor numeric;
  v_multiplier numeric;
  v_matchup_count integer;
  v_rating_a numeric;
  v_rating_b numeric;
  v_expected_a numeric;
  v_k_a numeric;
  v_k_b numeric;
  v_delta_a integer;
  v_delta_b integer;
  v_room_a integer;
  v_room_b integer;
begin
  if v_user_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'match_not_found'; end if;
  if v_match.status = 'confirmed' and v_match.confirmed_by_user_id = v_user_id then return; end if;
  if v_match.status <> 'submitted' then raise exception using errcode = '55000', message = 'match_not_submitted'; end if;

  select side into v_submitter_side from public.match_players
  where match_id = p_match_id and user_id = v_match.submitted_by_user_id;
  select side into v_confirmer_side from public.match_players
  where match_id = p_match_id and user_id = v_user_id;
  if v_confirmer_side is null then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  if v_confirmer_side = v_submitter_side then
    raise exception using errcode = '42501', message = 'confirmation_requires_opposite_side';
  end if;

  select jsonb_agg(jsonb_build_object('sideAPoints', side_a_points, 'sideBPoints', side_b_points) order by set_number)
  into v_sets from public.match_sets where match_id = p_match_id;
  v_winner := private.validate_match_sets(v_match.mode, v_match.points_to_win, v_match.best_of, v_sets);

  if v_match.mode = 'ranked' then
    v_kind := case when v_match.type = 'singles' then 'singles'::public.rating_kind else 'doubles'::public.rating_kind end;

    -- Serialize confirmations involving the same ratings.
    perform 1 from public.player_ratings r
    join public.match_players mp on mp.user_id = r.user_id
    where mp.match_id = p_match_id and r.season_id = v_match.season_id
    order by r.user_id for update of r;

    select avg(case when v_kind = 'singles' then r.singles_rating else r.doubles_rating end),
           avg(case when (case when v_kind = 'singles' then r.singles_ranked_matches else r.doubles_ranked_matches end) < 8 then 56
                    when (case when v_kind = 'singles' then r.singles_ranked_matches else r.doubles_ranked_matches end) >= 40 then 32 else 40 end)
    into v_rating_a, v_k_a
    from public.match_players mp join public.player_ratings r on r.user_id = mp.user_id and r.season_id = v_match.season_id
    where mp.match_id = p_match_id and mp.side = 'A';

    select avg(case when v_kind = 'singles' then r.singles_rating else r.doubles_rating end),
           avg(case when (case when v_kind = 'singles' then r.singles_ranked_matches else r.doubles_ranked_matches end) < 8 then 56
                    when (case when v_kind = 'singles' then r.singles_ranked_matches else r.doubles_ranked_matches end) >= 40 then 32 else 40 end)
    into v_rating_b, v_k_b
    from public.match_players mp join public.player_ratings r on r.user_id = mp.user_id and r.season_id = v_match.season_id
    where mp.match_id = p_match_id and mp.side = 'B';
    if v_rating_a is null or v_rating_b is null then raise exception using errcode = 'P0002', message = 'rating_not_found'; end if;

    v_expected_a := 1 / (1 + power(10::numeric, (v_rating_b - v_rating_a) / 400));
    select count(*) + 1 into v_matchup_count
    from public.matches m
    where m.id <> p_match_id and m.status = 'confirmed' and m.mode = 'ranked'
      and m.type = v_match.type and m.played_at >= v_match.played_at - interval '7 days'
      and m.played_at <= v_match.played_at
      and (select array_agg(user_id order by user_id) from public.match_players where match_id = m.id and side = 'A') in
          ((select array_agg(user_id order by user_id) from public.match_players where match_id = p_match_id and side = 'A'),
           (select array_agg(user_id order by user_id) from public.match_players where match_id = p_match_id and side = 'B'))
      and (select array_agg(user_id order by user_id) from public.match_players where match_id = m.id and side = 'B') in
          ((select array_agg(user_id order by user_id) from public.match_players where match_id = p_match_id and side = 'A'),
           (select array_agg(user_id order by user_id) from public.match_players where match_id = p_match_id and side = 'B'));
    v_anti_factor := private.anti_farming_factor(v_matchup_count);

    select count(*) filter (where (v_winner = 'A' and side_a_points > side_b_points) or (v_winner = 'B' and side_b_points > side_a_points)),
           count(*) filter (where (v_winner = 'A' and side_b_points > side_a_points) or (v_winner = 'B' and side_a_points > side_b_points)),
           sum(case when v_winner = 'A' then side_a_points else side_b_points end),
           sum(case when v_winner = 'A' then side_b_points else side_a_points end)
    into v_set_wins, v_loser_sets, v_winner_points, v_loser_points
    from public.match_sets where match_id = p_match_id;
    v_set_factor := case when v_set_wins = 2 and v_loser_sets = 0 then 1.12 when v_set_wins = 3 and v_loser_sets = 0 then 1.18 when v_set_wins = 3 and v_loser_sets = 1 then 1.08 else 1 end;
    v_point_factor := 1 + least(.18, ((v_winner_points - v_loser_points)::numeric / greatest(1, v_winner_points + v_loser_points)) * .7);
    v_format_factor := case when v_match.points_to_win = 21 then 1.08 else 1 end;
    v_multiplier := least(1.30, v_set_factor * v_point_factor * v_format_factor * v_anti_factor);
    v_delta_a := round(v_k_a * ((case when v_winner = 'A' then 1 else 0 end) - v_expected_a) * v_multiplier);
    v_delta_b := round(v_k_b * ((case when v_winner = 'B' then 1 else 0 end) - (1 - v_expected_a)) * v_multiplier);

    -- A team's common delta is constrained by the teammate with the least daily room.
    select min(case when v_delta_a >= 0 then 80 - daily_delta else 80 + daily_delta end) into v_room_a
    from (select mp.user_id, coalesce(sum(case when old_m.id is not null then old_mp.rating_delta else 0 end), 0)::integer daily_delta
          from public.match_players mp left join public.match_players old_mp on old_mp.user_id = mp.user_id
          left join public.matches old_m on old_m.id = old_mp.match_id and old_m.status = 'confirmed' and old_m.played_at >= date_trunc('day', v_match.played_at) and old_m.played_at < date_trunc('day', v_match.played_at) + interval '1 day'
          where mp.match_id = p_match_id and mp.side = 'A' group by mp.user_id) d;
    select min(case when v_delta_b >= 0 then 80 - daily_delta else 80 + daily_delta end) into v_room_b
    from (select mp.user_id, coalesce(sum(case when old_m.id is not null then old_mp.rating_delta else 0 end), 0)::integer daily_delta
          from public.match_players mp left join public.match_players old_mp on old_mp.user_id = mp.user_id
          left join public.matches old_m on old_m.id = old_mp.match_id and old_m.status = 'confirmed' and old_m.played_at >= date_trunc('day', v_match.played_at) and old_m.played_at < date_trunc('day', v_match.played_at) + interval '1 day'
          where mp.match_id = p_match_id and mp.side = 'B' group by mp.user_id) d;
    v_delta_a := greatest(-greatest(0, v_room_a), least(greatest(0, v_room_a), v_delta_a));
    v_delta_b := greatest(-greatest(0, v_room_b), least(greatest(0, v_room_b), v_delta_b));

    update public.match_players mp set
      rating_before = case when v_kind = 'singles' then r.singles_rating else r.doubles_rating end,
      rating_delta = case when mp.side = 'A' then v_delta_a else v_delta_b end,
      rating_after = (case when v_kind = 'singles' then r.singles_rating else r.doubles_rating end) + case when mp.side = 'A' then v_delta_a else v_delta_b end
    from public.player_ratings r where mp.match_id = p_match_id and r.user_id = mp.user_id and r.season_id = v_match.season_id;

    update public.player_ratings r set
      singles_rating = case when v_kind = 'singles' then r.singles_rating + mp.rating_delta else r.singles_rating end,
      doubles_rating = case when v_kind = 'doubles' then r.doubles_rating + mp.rating_delta else r.doubles_rating end,
      singles_ranked_matches = r.singles_ranked_matches + case when v_kind = 'singles' then 1 else 0 end,
      doubles_ranked_matches = r.doubles_ranked_matches + case when v_kind = 'doubles' then 1 else 0 end
    from public.match_players mp where mp.match_id = p_match_id and mp.user_id = r.user_id and r.season_id = v_match.season_id;
  else
    v_anti_factor := 1;
  end if;

  update public.matches set status = 'confirmed', winner_side = v_winner,
    confirmed_by_user_id = v_user_id, rating_applied = (mode = 'ranked'), anti_farming_factor = v_anti_factor
  where id = p_match_id;
  insert into public.match_events (match_id, user_id, type) values (p_match_id, v_user_id, 'confirmed');
end;
$$;

create or replace function private.cancel_match_command(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_match public.matches%rowtype;
begin
  if v_user_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'match_not_found'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_user_id) then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  if v_match.status = 'cancelled' then return; end if;
  if v_match.status <> 'ready' then raise exception using errcode = '55000', message = 'match_not_ready'; end if;
  update public.matches set status = 'cancelled' where id = p_match_id;
  insert into public.match_events (match_id, user_id, type) values (p_match_id, v_user_id, 'cancelled');
end; $$;

create or replace function private.dispute_match_command(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_match public.matches%rowtype;
begin
  if v_user_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'match_not_found'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_user_id) then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  if v_match.status = 'disputed' then return; end if;
  if v_match.status <> 'submitted' then raise exception using errcode = '55000', message = 'match_not_submitted'; end if;
  update public.matches set status = 'disputed' where id = p_match_id;
  insert into public.match_events (match_id, user_id, type) values (p_match_id, v_user_id, 'disputed');
end; $$;

create or replace function public.confirm_match_result_command(p_match_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.confirm_match_result_command(p_match_id) $$;
create or replace function public.cancel_match_command(p_match_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.cancel_match_command(p_match_id) $$;
create or replace function public.dispute_match_command(p_match_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.dispute_match_command(p_match_id) $$;

revoke all on function private.validate_match_sets(public.match_mode, smallint, smallint, jsonb) from public, anon, authenticated;
revoke all on function private.anti_farming_factor(integer) from public, anon, authenticated;
revoke all on function private.confirm_match_result_command(uuid) from public, anon;
revoke all on function private.cancel_match_command(uuid) from public, anon;
revoke all on function private.dispute_match_command(uuid) from public, anon;
revoke all on function public.confirm_match_result_command(uuid) from public, anon;
revoke all on function public.cancel_match_command(uuid) from public, anon;
revoke all on function public.dispute_match_command(uuid) from public, anon;
grant execute on function private.confirm_match_result_command(uuid) to authenticated;
grant execute on function private.cancel_match_command(uuid) to authenticated;
grant execute on function private.dispute_match_command(uuid) to authenticated;
grant execute on function public.confirm_match_result_command(uuid) to authenticated;
grant execute on function public.cancel_match_command(uuid) to authenticated;
grant execute on function public.dispute_match_command(uuid) to authenticated;
