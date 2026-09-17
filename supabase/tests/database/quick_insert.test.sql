begin;

select plan(10);

insert into auth.users (id, email)
values
  ('60000000-0000-0000-0000-000000000001', 'quick-a1@agilelab.it'),
  ('60000000-0000-0000-0000-000000000002', 'quick-a2@agilelab.it'),
  ('60000000-0000-0000-0000-000000000003', 'quick-b1@agilelab.it'),
  ('60000000-0000-0000-0000-000000000004', 'quick-b2@agilelab.it');

set local role service_role;
set local "request.jwt.claim.role" = 'service_role';

select lives_ok(
  $$ select public.quick_insert_match_command(
    'singles',
    11::smallint,
    3::smallint,
    array[
      '60000000-0000-0000-0000-000000000001'::uuid,
      '60000000-0000-0000-0000-000000000003'::uuid
    ],
    '[{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":11,"sideBPoints":8}]'::jsonb
  ) $$,
  'service role can submit a ranked singles quick insert'
);

select is(
  (select quick_insert from public.matches where created_by_user_id = '60000000-0000-0000-0000-000000000001' order by created_at desc limit 1),
  true,
  'quick insert match has its source tag'
);
select is(
  (select status::text from public.matches where created_by_user_id = '60000000-0000-0000-0000-000000000001' order by created_at desc limit 1),
  'submitted',
  'quick insert starts submitted'
);
select is(
  (select mode::text from public.matches where created_by_user_id = '60000000-0000-0000-0000-000000000001' order by created_at desc limit 1),
  'ranked',
  'quick insert is ranked'
);
select is(
  (select count(*) from public.match_players where match_id = (
    select id from public.matches where created_by_user_id = '60000000-0000-0000-0000-000000000001' order by created_at desc limit 1
  )),
  2::bigint,
  'singles quick insert stores two players'
);
select is(
  (select count(*) from public.match_sets where match_id = (
    select id from public.matches where created_by_user_id = '60000000-0000-0000-0000-000000000001' order by created_at desc limit 1
  )),
  2::bigint,
  'quick insert stores every set'
);
select is(
  (select count(*) from public.match_events where match_id = (
    select id from public.matches where created_by_user_id = '60000000-0000-0000-0000-000000000001' order by created_at desc limit 1
  )),
  2::bigint,
  'quick insert reuses created and submitted events only'
);
select is(
  (select submitted_by_user_id from public.matches where created_by_user_id = '60000000-0000-0000-0000-000000000001' order by created_at desc limit 1),
  '60000000-0000-0000-0000-000000000001'::uuid,
  'first Side A player is the technical submitter'
);

select lives_ok(
  $$ select public.quick_insert_match_command(
    'doubles',
    11::smallint,
    3::smallint,
    array[
      '60000000-0000-0000-0000-000000000001'::uuid,
      '60000000-0000-0000-0000-000000000002'::uuid,
      '60000000-0000-0000-0000-000000000003'::uuid,
      '60000000-0000-0000-0000-000000000004'::uuid
    ],
    '[{"sideAPoints":11,"sideBPoints":9},{"sideAPoints":8,"sideBPoints":11},{"sideAPoints":11,"sideBPoints":7}]'::jsonb
  ) $$,
  'service role can submit a ranked doubles quick insert'
);

select is(
  (select count(*) from public.match_players where match_id = (
    select id from public.matches where type = 'doubles' and quick_insert order by created_at desc limit 1
  )),
  4::bigint,
  'doubles quick insert stores four players'
);

select * from finish();
rollback;
