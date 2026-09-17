alter table public.matches
  add column quick_insert boolean not null default false;

create or replace function private.quick_insert_match_command(
  p_type public.match_type,
  p_points_to_win smallint,
  p_best_of smallint,
  p_player_ids uuid[],
  p_sets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match_id uuid := gen_random_uuid();
  v_season_id uuid;
  v_player_id uuid;
  v_player_number integer := 0;
  v_set jsonb;
  v_set_number integer := 0;
  v_expected_players integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'quick_insert_requires_service_role';
  end if;

  if p_type = 'singles' then
    v_expected_players := 2;
  elsif p_type = 'doubles' then
    v_expected_players := 4;
  else
    raise exception using errcode = '22023', message = 'invalid_match_type';
  end if;

  if p_points_to_win not in (11, 21) or p_best_of not in (3, 5) then
    raise exception using errcode = '22023', message = 'invalid_ranked_format';
  end if;

  if cardinality(p_player_ids) <> v_expected_players
    or exists (select 1 from unnest(p_player_ids) as players(player_id) where player_id is null)
    or (select count(distinct player_id) from unnest(p_player_ids) as players(player_id)) <> v_expected_players then
    raise exception using errcode = '22023', message = 'invalid_players';
  end if;

  if (select count(*) from public.profiles where id = any(p_player_ids)) <> v_expected_players then
    raise exception using errcode = 'P0002', message = 'player_not_found';
  end if;

  perform private.validate_match_sets('ranked', p_points_to_win, p_best_of, p_sets);

  select id into v_season_id
  from public.seasons
  where starts_at <= now() and ends_at > now()
  order by starts_at desc
  limit 1;

  if v_season_id is null then
    raise exception using errcode = 'P0002', message = 'active_season_not_found';
  end if;

  insert into public.matches (
    id,
    season_id,
    mode,
    type,
    status,
    points_to_win,
    best_of,
    played_at,
    created_by_user_id,
    submitted_by_user_id,
    quick_insert
  ) values (
    v_match_id,
    v_season_id,
    'ranked',
    p_type,
    'submitted',
    p_points_to_win,
    p_best_of,
    now(),
    p_player_ids[1],
    p_player_ids[1],
    true
  );

  foreach v_player_id in array p_player_ids loop
    v_player_number := v_player_number + 1;
    insert into public.match_players (match_id, user_id, side, position, rating_kind)
    values (
      v_match_id,
      v_player_id,
      case
        when p_type = 'singles' and v_player_number = 1 then 'A'::public.match_side
        when p_type = 'singles' then 'B'::public.match_side
        when v_player_number <= 2 then 'A'::public.match_side
        else 'B'::public.match_side
      end,
      case
        when p_type = 'singles' then 1
        when v_player_number in (1, 3) then 1
        else 2
      end,
      case when p_type = 'singles' then 'singles'::public.rating_kind else 'doubles'::public.rating_kind end
    );
  end loop;

  for v_set in select value from jsonb_array_elements(p_sets) loop
    v_set_number := v_set_number + 1;
    insert into public.match_sets (match_id, set_number, side_a_points, side_b_points)
    values (
      v_match_id,
      v_set_number,
      (v_set->>'sideAPoints')::integer,
      (v_set->>'sideBPoints')::integer
    );
  end loop;

  insert into public.match_events (match_id, user_id, type)
  values
    (v_match_id, p_player_ids[1], 'created'),
    (v_match_id, p_player_ids[1], 'submitted');

  return v_match_id;
end;
$$;

create or replace function public.quick_insert_match_command(
  p_type public.match_type,
  p_points_to_win smallint,
  p_best_of smallint,
  p_player_ids uuid[],
  p_sets jsonb
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.quick_insert_match_command(p_type, p_points_to_win, p_best_of, p_player_ids, p_sets)
$$;

revoke all on function private.quick_insert_match_command(public.match_type, smallint, smallint, uuid[], jsonb)
  from public, anon, authenticated;
revoke all on function public.quick_insert_match_command(public.match_type, smallint, smallint, uuid[], jsonb)
  from public, anon, authenticated;
grant execute on function public.quick_insert_match_command(public.match_type, smallint, smallint, uuid[], jsonb)
  to service_role;
