create or replace function private.edit_last_match_result_command(p_match_id uuid, p_sets jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_confirmed_at timestamptz;
  v_submitter_id uuid;
  v_set jsonb;
  v_number integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'match_not_found';
  end if;
  if v_match.status <> 'confirmed' then
    raise exception using errcode = '55000', message = 'match_not_confirmed';
  end if;
  if not exists (
    select 1 from public.match_players
    where match_id = p_match_id and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'not_a_participant';
  end if;

  select min(created_at) into v_confirmed_at
  from public.match_events
  where match_id = p_match_id and type = 'confirmed';

  if v_confirmed_at is null or clock_timestamp() > v_confirmed_at + interval '1 hour' then
    raise exception using errcode = '55000', message = 'edit_window_expired';
  end if;

  perform private.validate_match_sets(v_match.mode, v_match.points_to_win, v_match.best_of, p_sets);

  if v_match.mode = 'ranked' and v_match.rating_applied then
    perform 1
    from public.player_ratings r
    join public.match_players mp on mp.user_id = r.user_id
    where mp.match_id = p_match_id and r.season_id = v_match.season_id
    order by r.user_id
    for update of r;
  end if;

  if exists (
    select 1
    from public.matches later
    join public.match_players later_mp on later_mp.match_id = later.id
    join public.match_players current_mp
      on current_mp.match_id = p_match_id
     and current_mp.user_id = later_mp.user_id
    where later.id <> p_match_id
      and later.status in ('submitted', 'confirmed')
      and (coalesce(later.played_at, later.created_at), later.created_at, later.id)
        > (coalesce(v_match.played_at, v_match.created_at), v_match.created_at, v_match.id)
  ) then
    raise exception using errcode = '55000', message = 'not_latest_match';
  end if;

  if v_match.mode = 'ranked' and v_match.rating_applied then
    update public.player_ratings r set
      singles_rating = case when v_match.type = 'singles' then r.singles_rating - mp.rating_delta else r.singles_rating end,
      doubles_rating = case when v_match.type = 'doubles' then r.doubles_rating - mp.rating_delta else r.doubles_rating end,
      singles_ranked_matches = case when v_match.type = 'singles' then r.singles_ranked_matches - 1 else r.singles_ranked_matches end,
      doubles_ranked_matches = case when v_match.type = 'doubles' then r.doubles_ranked_matches - 1 else r.doubles_ranked_matches end
    from public.match_players mp
    where mp.match_id = p_match_id
      and mp.user_id = r.user_id
      and r.season_id = v_match.season_id;
  end if;

  update public.match_players set
    rating_before = null,
    rating_after = null,
    rating_delta = null
  where match_id = p_match_id;

  delete from public.match_sets where match_id = p_match_id;
  for v_set in select value from jsonb_array_elements(p_sets) loop
    v_number := v_number + 1;
    insert into public.match_sets (match_id, set_number, side_a_points, side_b_points)
    values (p_match_id, v_number, (v_set->>'sideAPoints')::integer, (v_set->>'sideBPoints')::integer);
  end loop;

  select opponent.user_id into v_submitter_id
  from public.match_players editor
  join public.match_players opponent
    on opponent.match_id = editor.match_id and opponent.side <> editor.side
  where editor.match_id = p_match_id and editor.user_id = v_user_id
  order by opponent.position
  limit 1;

  update public.matches set
    status = 'submitted',
    winner_side = null,
    rating_applied = false,
    anti_farming_factor = 1,
    submitted_by_user_id = v_submitter_id,
    confirmed_by_user_id = null
  where id = p_match_id;

  insert into public.match_events (match_id, user_id, type)
  values (p_match_id, v_user_id, 'admin_edited');

  perform private.confirm_match_result_command(p_match_id);
end;
$$;

create or replace function public.edit_last_match_result_command(p_match_id uuid, p_sets jsonb)
returns void
language sql
security definer
set search_path = ''
as $$ select private.edit_last_match_result_command(p_match_id, p_sets) $$;

revoke all on function private.edit_last_match_result_command(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.edit_last_match_result_command(uuid, jsonb) from public, anon;
grant execute on function public.edit_last_match_result_command(uuid, jsonb) to authenticated;

create or replace function private.cancel_match_command(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_match public.matches%rowtype;
begin
  if v_user_id is null then raise exception using errcode = '28000', message = 'authentication_required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'match_not_found'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_user_id) then raise exception using errcode = '42501', message = 'not_a_participant'; end if;
  if v_match.status = 'cancelled' then return; end if;
  if v_match.status not in ('ready', 'submitted') then raise exception using errcode = '55000', message = 'match_not_cancellable'; end if;
  update public.matches set status = 'cancelled' where id = p_match_id;
  insert into public.match_events (match_id, user_id, type) values (p_match_id, v_user_id, 'cancelled');
end; $$;
