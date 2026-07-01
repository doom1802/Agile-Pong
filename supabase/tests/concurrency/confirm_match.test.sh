#!/usr/bin/env bash

set -euo pipefail

container="${SUPABASE_DB_CONTAINER:-}"
if [[ -z "$container" ]]; then
  container="$(docker ps --format '{{.Names}}' | awk '/^supabase_db_/ { print; exit }')"
fi

if [[ -z "$container" ]]; then
  echo "No running local Supabase database container found." >&2
  exit 1
fi

psql_admin() {
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

cleanup() {
  psql_admin >/dev/null <<'SQL'
delete from public.matches where id = '40000000-0000-0000-0000-000000000001';
delete from auth.users where id in (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002'
);
SQL
}

trap cleanup EXIT
cleanup

psql_admin >/dev/null <<'SQL'
insert into auth.users (id, email)
values
  ('30000000-0000-0000-0000-000000000001', 'concurrent-a@agilelab.it'),
  ('30000000-0000-0000-0000-000000000002', 'concurrent-b@agilelab.it');

insert into public.matches (
  id, season_id, mode, type, status, points_to_win, best_of, played_at,
  created_by_user_id, submitted_by_user_id
)
values (
  '40000000-0000-0000-0000-000000000001',
  (select id from public.seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1),
  'ranked', 'singles', 'submitted', 11, 3, now(),
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001'
);

insert into public.match_players (match_id, user_id, side, position, rating_kind)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'A', 1, 'singles'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'B', 1, 'singles');

insert into public.match_sets (match_id, set_number, side_a_points, side_b_points)
values
  ('40000000-0000-0000-0000-000000000001', 1, 11, 7),
  ('40000000-0000-0000-0000-000000000001', 2, 11, 8);
SQL

docker exec -e PGAPPNAME=agile_pong_concurrency_first -i "$container" \
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null <<'SQL' &
begin;
set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-0000-0000-000000000002';
select public.confirm_match_result_command('40000000-0000-0000-0000-000000000001');
select pg_sleep(3);
commit;
SQL
first_pid=$!

first_holds_lock=0
for _ in {1..30}; do
  if [[ "$(psql_admin -Atc "select count(*) from pg_stat_activity where application_name = 'agile_pong_concurrency_first' and state = 'active' and query like '%pg_sleep%'")" == "1" ]]; then
    first_holds_lock=1
    break
  fi
  sleep 0.1
done

if [[ "$first_holds_lock" != "1" ]]; then
  echo "First confirmation did not reach the lock-holding phase." >&2
  wait "$first_pid"
  exit 1
fi

docker exec -e PGAPPNAME=agile_pong_concurrency_second -i "$container" \
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null <<'SQL' &
begin;
set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-0000-0000-000000000002';
select public.confirm_match_result_command('40000000-0000-0000-0000-000000000001');
commit;
SQL
second_pid=$!

observed_lock_wait=0
for _ in {1..30}; do
  if [[ "$(psql_admin -Atc "select count(*) from pg_stat_activity where application_name = 'agile_pong_concurrency_second' and wait_event_type = 'Lock'")" == "1" ]]; then
    observed_lock_wait=1
    break
  fi
  sleep 0.1
done

wait "$first_pid"
wait "$second_pid"

if [[ "$observed_lock_wait" != "1" ]]; then
  echo "Second confirmation was not observed waiting on the match lock." >&2
  exit 1
fi

psql_admin >/dev/null <<'SQL'
do $$
declare
  v_status public.match_status;
  v_events bigint;
  v_a_rating integer;
  v_b_rating integer;
  v_a_matches integer;
  v_b_matches integer;
begin
  select status into v_status
  from public.matches
  where id = '40000000-0000-0000-0000-000000000001';

  select count(*) into v_events
  from public.match_events
  where match_id = '40000000-0000-0000-0000-000000000001'
    and type = 'confirmed';

  select singles_rating, singles_ranked_matches into v_a_rating, v_a_matches
  from public.player_ratings
  where user_id = '30000000-0000-0000-0000-000000000001';

  select singles_rating, singles_ranked_matches into v_b_rating, v_b_matches
  from public.player_ratings
  where user_id = '30000000-0000-0000-0000-000000000002';

  if v_status <> 'confirmed' then raise exception 'Expected confirmed status, got %', v_status; end if;
  if v_events <> 1 then raise exception 'Expected one confirmation event, got %', v_events; end if;
  if v_a_rating <> 1036 or v_b_rating <> 964 then
    raise exception 'Expected ratings 1036/964, got %/%', v_a_rating, v_b_rating;
  end if;
  if v_a_matches <> 1 or v_b_matches <> 1 then
    raise exception 'Expected counters 1/1, got %/%', v_a_matches, v_b_matches;
  end if;
end;
$$;
SQL

echo "Concurrent confirmation test passed: lock wait observed and Elo applied once."
