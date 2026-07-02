begin;

select plan(13);

insert into auth.users (id, email)
values
  ('50000000-0000-0000-0000-000000000001', 'edit-a@agilelab.it'),
  ('50000000-0000-0000-0000-000000000002', 'edit-b@agilelab.it'),
  ('50000000-0000-0000-0000-000000000003', 'edit-unrelated@agilelab.it');

insert into public.matches (
  id, season_id, mode, type, status, points_to_win, best_of, winner_side,
  played_at, created_by_user_id, rating_applied, submitted_by_user_id, confirmed_by_user_id
)
values (
  '60000000-0000-0000-0000-000000000001',
  (select id from public.seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1),
  'ranked', 'singles', 'confirmed', 11, 3, 'A', now(),
  '50000000-0000-0000-0000-000000000001', true,
  '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002'
);

insert into public.match_players (
  match_id, user_id, side, position, rating_kind, rating_before, rating_after, rating_delta
)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'A', 1, 'singles', 1000, 1036, 36),
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'B', 1, 'singles', 1000, 964, -36);

insert into public.match_sets (match_id, set_number, side_a_points, side_b_points)
values
  ('60000000-0000-0000-0000-000000000001', 1, 11, 8),
  ('60000000-0000-0000-0000-000000000001', 2, 11, 9);

update public.player_ratings
set singles_rating = case when user_id = '50000000-0000-0000-0000-000000000001' then 1036 else 964 end,
    singles_ranked_matches = 1
where user_id in (
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002'
);

insert into public.match_events (match_id, user_id, type)
values ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'confirmed');

set local role authenticated;
set local "request.jwt.claim.sub" = '50000000-0000-0000-0000-000000000003';

select throws_ok(
  $$ select public.edit_last_match_result_command(
    '60000000-0000-0000-0000-000000000001',
    '[{"sideAPoints":8,"sideBPoints":11},{"sideAPoints":9,"sideBPoints":11}]'::jsonb
  ) $$,
  '42501', 'not_a_participant',
  'an unrelated user cannot edit a confirmed match'
);

set local "request.jwt.claim.sub" = '50000000-0000-0000-0000-000000000001';

reset role;
update public.match_events
set created_at = now() - interval '61 minutes'
where match_id = '60000000-0000-0000-0000-000000000001' and type = 'confirmed';
set local role authenticated;

select throws_ok(
  $$ select public.edit_last_match_result_command(
    '60000000-0000-0000-0000-000000000001',
    '[{"sideAPoints":8,"sideBPoints":11},{"sideAPoints":9,"sideBPoints":11}]'::jsonb
  ) $$,
  '55000', 'edit_window_expired',
  'a match cannot be edited after one hour'
);

reset role;
update public.match_events
set created_at = now()
where match_id = '60000000-0000-0000-0000-000000000001' and type = 'confirmed';

insert into public.matches (
  id, season_id, mode, type, status, points_to_win, best_of, played_at,
  created_by_user_id, submitted_by_user_id
)
values (
  '60000000-0000-0000-0000-000000000002',
  (select season_id from public.matches where id = '60000000-0000-0000-0000-000000000001'),
  'ranked', 'singles', 'submitted', 11, 3, now() + interval '1 minute',
  '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'
);

insert into public.match_players (match_id, user_id, side, position, rating_kind)
values
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'A', 1, 'singles'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'B', 1, 'singles');

set local role authenticated;
select throws_ok(
  $$ select public.edit_last_match_result_command(
    '60000000-0000-0000-0000-000000000001',
    '[{"sideAPoints":8,"sideBPoints":11},{"sideAPoints":9,"sideBPoints":11}]'::jsonb
  ) $$,
  '55000', 'not_latest_match',
  'a match cannot be edited when a participant has a later match'
);

reset role;
delete from public.matches where id = '60000000-0000-0000-0000-000000000002';
set local role authenticated;

select lives_ok(
  $$ select public.edit_last_match_result_command(
    '60000000-0000-0000-0000-000000000001',
    '[{"sideAPoints":8,"sideBPoints":11},{"sideAPoints":9,"sideBPoints":11}]'::jsonb
  ) $$,
  'a participant can edit the latest match during the one-hour window'
);

select is(
  (select status::text || ':' || winner_side::text || ':' || rating_applied::text
   from public.matches where id = '60000000-0000-0000-0000-000000000001'),
  'confirmed:B:true',
  'editing atomically reconfirms the corrected winner'
);

select is(
  (select string_agg(side_a_points::text || '-' || side_b_points::text, ',' order by set_number)
   from public.match_sets where match_id = '60000000-0000-0000-0000-000000000001'),
  '8-11,9-11',
  'editing replaces the stored sets'
);

select is(
  (select singles_ranked_matches from public.player_ratings where user_id = '50000000-0000-0000-0000-000000000001'),
  1,
  'editing does not double-count the ranked match'
);

select ok(
  (select singles_rating < 1000 from public.player_ratings where user_id = '50000000-0000-0000-0000-000000000001'),
  'the corrected loser receives a recalculated rating'
);

select ok(
  (select singles_rating > 1000 from public.player_ratings where user_id = '50000000-0000-0000-0000-000000000002'),
  'the corrected winner receives a recalculated rating'
);

select is(
  (select count(*) from public.match_events
   where match_id = '60000000-0000-0000-0000-000000000001' and type = 'admin_edited'),
  1::bigint,
  'editing records an audit event'
);

set local "request.jwt.claim.sub" = '50000000-0000-0000-0000-000000000002';
select lives_ok(
  $$ select public.edit_last_match_result_command(
    '60000000-0000-0000-0000-000000000001',
    '[{"sideAPoints":11,"sideBPoints":8},{"sideAPoints":11,"sideBPoints":9}]'::jsonb
  ) $$,
  'the other participant can also edit the latest match'
);

reset role;
insert into public.matches (
  id, season_id, mode, type, status, points_to_win, best_of, played_at,
  created_by_user_id, submitted_by_user_id
)
values (
  '60000000-0000-0000-0000-000000000003',
  (select season_id from public.matches where id = '60000000-0000-0000-0000-000000000001'),
  'ranked', 'singles', 'submitted', 11, 3, now(),
  '50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'
);
insert into public.match_players (match_id, user_id, side, position, rating_kind)
values
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'A', 1, 'singles'),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'B', 1, 'singles');

set local role authenticated;
set local "request.jwt.claim.sub" = '50000000-0000-0000-0000-000000000002';
select lives_ok(
  $$ select public.cancel_match_command('60000000-0000-0000-0000-000000000003') $$,
  'a participant can cancel a submitted match'
);
select is(
  (select status::text from public.matches where id = '60000000-0000-0000-0000-000000000003'),
  'cancelled',
  'cancelling a submitted match stores the cancelled state'
);

select * from finish();
rollback;
