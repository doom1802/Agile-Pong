begin;

select plan(36);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'workflow-a@agilelab.it'),
  ('10000000-0000-0000-0000-000000000002', 'workflow-b@agilelab.it'),
  ('10000000-0000-0000-0000-000000000003', 'workflow-unrelated@agilelab.it'),
  ('10000000-0000-0000-0000-000000000004', 'cap-winner@agilelab.it'),
  ('10000000-0000-0000-0000-000000000005', 'cap-loser@agilelab.it'),
  ('10000000-0000-0000-0000-000000000006', 'cap-history@agilelab.it'),
  ('10000000-0000-0000-0000-000000000007', 'doubles-a1@agilelab.it'),
  ('10000000-0000-0000-0000-000000000008', 'doubles-a2@agilelab.it'),
  ('10000000-0000-0000-0000-000000000009', 'doubles-b1@agilelab.it'),
  ('10000000-0000-0000-0000-000000000010', 'doubles-b2@agilelab.it'),
  ('10000000-0000-0000-0000-000000000011', 'rating-init@agilelab.it');

select is(
  (select count(*) from public.player_ratings where user_id = '10000000-0000-0000-0000-000000000011'),
  1::bigint,
  'new company user receives a rating for the active season'
);

update public.profiles set nickname = 'UniqueNick'
where id = '10000000-0000-0000-0000-000000000001';

select throws_ok(
  $$ update public.profiles set nickname = ' uniquenick ' where id = '10000000-0000-0000-0000-000000000002' $$,
  '23505', 'duplicate key value violates unique constraint "profiles_nickname_unique_ci"',
  'nickname uniqueness ignores casing and surrounding spaces'
);

insert into public.matches (
  id, season_id, mode, type, status, points_to_win, best_of, winner_side,
  played_at, created_by_user_id, rating_applied, submitted_by_user_id, confirmed_by_user_id
)
values (
  '20000000-0000-0000-0000-000000000001',
  (select id from public.seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1),
  'ranked', 'singles', 'confirmed', 11, 3, 'A', date_trunc('day', now()) + interval '1 hour',
  '10000000-0000-0000-0000-000000000004', true,
  '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006'
);

insert into public.match_players (match_id, user_id, side, position, rating_kind, rating_before, rating_after, rating_delta)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'A', 1, 'singles', 1000, 1075, 75),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'B', 1, 'singles', 1000, 925, -75);

update public.player_ratings
set singles_rating = case when user_id = '10000000-0000-0000-0000-000000000004' then 1075 else 925 end,
    singles_ranked_matches = 1
where user_id in ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006');

insert into public.matches (
  id, season_id, mode, type, status, points_to_win, best_of, winner_side,
  played_at, created_by_user_id, rating_applied, submitted_by_user_id, confirmed_by_user_id
)
values (
  '20000000-0000-0000-0000-000000000002',
  (select id from public.seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1),
  'ranked', 'singles', 'confirmed', 11, 3, 'A', date_trunc('day', now()) + interval '2 hours',
  '10000000-0000-0000-0000-000000000006', true,
  '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005'
);

insert into public.match_players (match_id, user_id, side, position, rating_kind, rating_before, rating_after, rating_delta)
values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'A', 1, 'singles', 925, 1000, 75),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'B', 1, 'singles', 1000, 925, -75);

update public.player_ratings
set singles_rating = case when user_id = '10000000-0000-0000-0000-000000000006' then 1000 else 925 end,
    singles_ranked_matches = case when user_id = '10000000-0000-0000-0000-000000000006' then 2 else 1 end
where user_id in ('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006');

insert into public.matches (
  id, season_id, mode, type, status, points_to_win, best_of, winner_side,
  played_at, created_by_user_id, rating_applied, submitted_by_user_id, confirmed_by_user_id
)
select
  match_id,
  (select id from public.seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1),
  'ranked'::public.match_mode, 'doubles'::public.match_type, 'confirmed'::public.match_status,
  11::smallint, 3::smallint, 'A'::public.match_side, now() - age,
  '10000000-0000-0000-0000-000000000007'::uuid, true,
  '10000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000009'::uuid
from (values
  ('20000000-0000-0000-0000-000000000101'::uuid, interval '3 days'),
  ('20000000-0000-0000-0000-000000000102'::uuid, interval '2 days'),
  ('20000000-0000-0000-0000-000000000103'::uuid, interval '1 day')
) history(match_id, age);

insert into public.match_players (match_id, user_id, side, position, rating_kind)
select match_id, user_id, side, position, 'doubles'::public.rating_kind
from (
  values
    ('20000000-0000-0000-0000-000000000101'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, 'A'::public.match_side, 1::smallint),
    ('20000000-0000-0000-0000-000000000101'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, 'A'::public.match_side, 2::smallint),
    ('20000000-0000-0000-0000-000000000101'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, 'B'::public.match_side, 1::smallint),
    ('20000000-0000-0000-0000-000000000101'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, 'B'::public.match_side, 2::smallint),
    ('20000000-0000-0000-0000-000000000102'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, 'A'::public.match_side, 1::smallint),
    ('20000000-0000-0000-0000-000000000102'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, 'A'::public.match_side, 2::smallint),
    ('20000000-0000-0000-0000-000000000102'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, 'B'::public.match_side, 1::smallint),
    ('20000000-0000-0000-0000-000000000102'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, 'B'::public.match_side, 2::smallint),
    ('20000000-0000-0000-0000-000000000103'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, 'A'::public.match_side, 1::smallint),
    ('20000000-0000-0000-0000-000000000103'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, 'A'::public.match_side, 2::smallint),
    ('20000000-0000-0000-0000-000000000103'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, 'B'::public.match_side, 1::smallint),
    ('20000000-0000-0000-0000-000000000103'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, 'B'::public.match_side, 2::smallint)
) players(match_id, user_id, side, position);

set local role anon;
select throws_ok(
  $$ select count(*) from public.matches $$,
  '42501', 'permission denied for table matches',
  'anonymous users cannot read company matches'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';

select throws_ok(
  $$ insert into public.matches (mode, type, created_by_user_id) values ('unranked', 'singles', '10000000-0000-0000-0000-000000000001') $$,
  '42501', 'permission denied for table matches',
  'authenticated users cannot write matches directly'
);

select throws_ok(
  $$ update public.profiles set email = 'changed@agilelab.it' where id = '10000000-0000-0000-0000-000000000001' $$,
  '42501', 'permission denied for table profiles',
  'authenticated users cannot change protected profile columns'
);

select lives_ok(
  $$ select public.create_match_command('ranked', 'singles', 11::smallint, 3::smallint, array['10000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000002'::uuid]) $$,
  'creator can create a ranked singles match'
);

select is(
  (select count(*) from public.match_events where match_id = (
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'ready' order by created_at desc limit 1
  ) and type = 'created'),
  1::bigint,
  'match creation is audited once'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000003';
select throws_ok(
  $$ select public.submit_match_result_command(
    (select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'ready' order by created_at desc limit 1),
    '[{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":11,"sideBPoints":8}]'::jsonb
  ) $$,
  '42501', 'not_a_participant',
  'unrelated user cannot submit a result'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.submit_match_result_command(
    (select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'ready' order by created_at desc limit 1),
    '[{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":11,"sideBPoints":8}]'::jsonb
  ) $$,
  'participant can submit a valid ranked result'
);

select throws_ok(
  $$ select public.submit_match_result_command(
    (select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'submitted' order by created_at desc limit 1),
    '[{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":11,"sideBPoints":8}]'::jsonb
  ) $$,
  '55000', 'match_not_ready',
  'repeated submission cannot replace stored sets'
);

select throws_ok(
  $$ select public.confirm_match_result_command((
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'submitted' order by created_at desc limit 1
  )) $$,
  '42501', 'confirmation_requires_opposite_side',
  'submitter cannot confirm their own result'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000003';
select throws_ok(
  $$ select public.confirm_match_result_command((
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'submitted' order by created_at desc limit 1
  )) $$,
  '42501', 'not_a_participant',
  'unrelated user cannot confirm a result'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';
select lives_ok(
  $$ select public.confirm_match_result_command((
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'submitted' order by created_at desc limit 1
  )) $$,
  'opposite-side participant can confirm the result'
);

select is(
  (select status::text || ':' || winner_side::text || ':' || rating_applied::text
   from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'confirmed' order by created_at desc limit 1),
  'confirmed:A:true',
  'confirmation derives winner and marks ranked rating applied'
);

select is(
  (select anti_farming_factor from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'confirmed' order by created_at desc limit 1),
  1::numeric,
  'first singles matchup receives full anti-farming weight'
);

select is(
  (select rating_before::text || ':' || rating_after::text || ':' || rating_delta::text
   from public.match_players where user_id = '10000000-0000-0000-0000-000000000001' order by rating_delta desc nulls last limit 1),
  '1000:1036:36',
  'winner stores the expected provisional Elo snapshot'
);

select is(
  (select rating_before::text || ':' || rating_after::text || ':' || rating_delta::text
   from public.match_players where user_id = '10000000-0000-0000-0000-000000000002' order by rating_delta asc nulls last limit 1),
  '1000:964:-36',
  'loser stores the expected provisional Elo snapshot'
);

select is(
  (select singles_rating::text || ':' || singles_ranked_matches::text from public.player_ratings where user_id = '10000000-0000-0000-0000-000000000001'),
  '1036:1',
  'winner rating and ranked counter update exactly once'
);

select lives_ok(
  $$ select public.confirm_match_result_command((
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'confirmed' order by created_at desc limit 1
  )) $$,
  'same confirmer retry is idempotent'
);

select is(
  (select count(*) from public.match_events where match_id = (
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and status = 'confirmed' order by created_at desc limit 1
  ) and type = 'confirmed'),
  1::bigint,
  'confirmation retry does not duplicate the audit event'
);

select is(
  (select singles_rating::text || ':' || singles_ranked_matches::text from public.player_ratings where user_id = '10000000-0000-0000-0000-000000000001'),
  '1036:1',
  'confirmation retry does not apply Elo twice'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.create_match_command('unranked', 'singles', null::smallint, null::smallint, array['10000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000003'::uuid]) $$,
  'creator can create an unranked match'
);

select lives_ok(
  $$ select public.submit_match_result_command(
    (select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and mode = 'unranked' and status = 'ready' order by created_at desc limit 1),
    '[{"sideAPoints":3,"sideBPoints":1}]'::jsonb
  ) $$,
  'unranked match accepts flexible valid scores'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000003';
select lives_ok(
  $$ select public.confirm_match_result_command((
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and mode = 'unranked' and status = 'submitted' order by created_at desc limit 1
  )) $$,
  'opponent can confirm an unranked match'
);

select is(
  (select rating_applied::text || ':' || anti_farming_factor::text
   from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000001' and mode = 'unranked' and status = 'confirmed' order by created_at desc limit 1),
  'false:1.000',
  'unranked confirmation does not apply rating changes'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000004';
select lives_ok(
  $$ select public.create_match_command('ranked', 'singles', 11::smallint, 3::smallint, array['10000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000005'::uuid]) $$,
  'daily-cap player can create another ranked match'
);

select lives_ok(
  $$ select public.submit_match_result_command(
    (select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000004' and status = 'ready' order by created_at desc limit 1),
    '[{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":11,"sideBPoints":8}]'::jsonb
  ) $$,
  'daily-cap match can be submitted'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000005';
select lives_ok(
  $$ select public.confirm_match_result_command((
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000004' and status = 'submitted' order by created_at desc limit 1
  )) $$,
  'daily-cap match can be confirmed'
);

select is(
  (select sum(rating_delta) from public.match_players where user_id = '10000000-0000-0000-0000-000000000004'),
  80::bigint,
  'daily positive rating delta is capped at plus 80'
);

select is(
  (select sum(rating_delta) from public.match_players where user_id = '10000000-0000-0000-0000-000000000005'),
  (-80)::bigint,
  'daily negative rating delta is capped at minus 80'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000007';
select lives_ok(
  $$ select public.create_match_command(
    'ranked', 'doubles', 11::smallint, 3::smallint,
    array[
      '10000000-0000-0000-0000-000000000007'::uuid,
      '10000000-0000-0000-0000-000000000008'::uuid,
      '10000000-0000-0000-0000-000000000009'::uuid,
      '10000000-0000-0000-0000-000000000010'::uuid
    ]
  ) $$,
  'creator can create the fourth doubles team matchup'
);

select lives_ok(
  $$ select public.submit_match_result_command(
    (select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000007' and status = 'ready' order by created_at desc limit 1),
    '[{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":11,"sideBPoints":8}]'::jsonb
  ) $$,
  'fourth doubles matchup can be submitted'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000009';
select lives_ok(
  $$ select public.confirm_match_result_command((
    select id from public.matches where created_by_user_id = '10000000-0000-0000-0000-000000000007' and status = 'submitted' order by created_at desc limit 1
  )) $$,
  'opposite doubles team can confirm'
);

select is(
  (select anti_farming_factor from public.matches match
   where match.created_by_user_id = '10000000-0000-0000-0000-000000000007'
     and match.status = 'confirmed'
     and exists (select 1 from public.match_events event where event.match_id = match.id and event.type = 'created')
   order by match.created_at desc limit 1),
  .5::numeric,
  'fourth doubles team matchup receives half anti-farming weight'
);

select is(
  (select string_agg(rating_delta::text, ',' order by side, position)
   from public.match_players where match_id = (
     select match.id from public.matches match
     where match.created_by_user_id = '10000000-0000-0000-0000-000000000007'
       and match.status = 'confirmed'
       and exists (select 1 from public.match_events event where event.match_id = match.id and event.type = 'created')
     order by match.created_at desc limit 1
   )),
  '18,18,-18,-18',
  'half-weight doubles Elo applies one shared delta per team'
);

select is(
  (select sum(doubles_ranked_matches) from public.player_ratings where user_id in (
    '10000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000010'
  )),
  4::bigint,
  'doubles ranked counters update once for all four players'
);

select * from finish();
rollback;
