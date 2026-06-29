create or replace function private.create_match_command(
  p_mode public.match_mode,
  p_type public.match_type,
  p_points_to_win smallint,
  p_best_of smallint,
  p_player_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_match_id uuid;
  v_season_id uuid;
  v_expected_players integer := case when p_type = 'singles' then 2 else 4 end;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if coalesce(array_length(p_player_ids, 1), 0) <> v_expected_players then raise exception 'Invalid player count'; end if;
  if p_player_ids[1] <> v_user_id then raise exception 'Creator must be first player'; end if;
  if (select count(distinct id) from unnest(p_player_ids) id) <> v_expected_players then raise exception 'Players must be unique'; end if;
  if (select count(*) from public.profiles where id = any(p_player_ids)) <> v_expected_players then raise exception 'Unknown player'; end if;

  if p_mode = 'ranked' then
    if p_points_to_win not in (11, 21) or p_best_of not in (3, 5) then raise exception 'Invalid ranked format'; end if;
    select id into v_season_id from public.seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1;
    if v_season_id is null then raise exception 'No active season'; end if;
  end if;

  insert into public.matches (season_id, mode, type, points_to_win, best_of, created_by_user_id)
  values (v_season_id, p_mode, p_type, p_points_to_win, p_best_of, v_user_id)
  returning id into v_match_id;

  for v_index in 1..v_expected_players loop
    insert into public.match_players (match_id, user_id, side, position, rating_kind)
    values (
      v_match_id,
      p_player_ids[v_index],
      case when (p_type = 'singles' and v_index = 1) or (p_type = 'doubles' and v_index <= 2) then 'A'::public.match_side else 'B'::public.match_side end,
      case when p_type = 'singles' then 1 else ((v_index - 1) % 2) + 1 end,
      case when p_mode = 'unranked' then 'none'::public.rating_kind when p_type = 'singles' then 'singles'::public.rating_kind else 'doubles'::public.rating_kind end
    );
  end loop;

  insert into public.match_events (match_id, user_id, type) values (v_match_id, v_user_id, 'created');
  return v_match_id;
end;
$$;

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
  v_a integer;
  v_b integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'ready' then raise exception 'Match is not ready'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match_id and user_id = v_user_id) then raise exception 'Not a participant'; end if;
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then raise exception 'Sets are required'; end if;

  delete from public.match_sets where match_id = p_match_id;
  for v_set in select value from jsonb_array_elements(p_sets) loop
    v_number := v_number + 1;
    v_a := (v_set->>'sideAPoints')::integer;
    v_b := (v_set->>'sideBPoints')::integer;
    if v_a < 0 or v_b < 0 or v_a = v_b then raise exception 'Invalid set score'; end if;
    insert into public.match_sets (match_id, set_number, side_a_points, side_b_points)
    values (p_match_id, v_number, v_a, v_b);
  end loop;

  update public.matches set status = 'submitted', submitted_by_user_id = v_user_id, played_at = now() where id = p_match_id;
  insert into public.match_events (match_id, user_id, type) values (p_match_id, v_user_id, 'submitted');
end;
$$;

create or replace function public.create_match_command(p_mode public.match_mode, p_type public.match_type, p_points_to_win smallint, p_best_of smallint, p_player_ids uuid[])
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_match_command(p_mode, p_type, p_points_to_win, p_best_of, p_player_ids) $$;

create or replace function public.submit_match_result_command(p_match_id uuid, p_sets jsonb)
returns void language sql security invoker set search_path = ''
as $$ select private.submit_match_result_command(p_match_id, p_sets) $$;

revoke all on function private.create_match_command(public.match_mode, public.match_type, smallint, smallint, uuid[]) from public, anon;
revoke all on function private.submit_match_result_command(uuid, jsonb) from public, anon;
grant execute on function private.create_match_command(public.match_mode, public.match_type, smallint, smallint, uuid[]) to authenticated;
grant execute on function private.submit_match_result_command(uuid, jsonb) to authenticated;
revoke all on function public.create_match_command(public.match_mode, public.match_type, smallint, smallint, uuid[]) from public, anon;
revoke all on function public.submit_match_result_command(uuid, jsonb) from public, anon;
grant execute on function public.create_match_command(public.match_mode, public.match_type, smallint, smallint, uuid[]) to authenticated;
grant execute on function public.submit_match_result_command(uuid, jsonb) to authenticated;
