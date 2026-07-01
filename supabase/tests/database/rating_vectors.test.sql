begin;
select plan(12);

select is(private.anti_farming_factor(1), 1::numeric, 'first matchup has full weight');
select is(private.anti_farming_factor(3), 1::numeric, 'third matchup has full weight');
select is(private.anti_farming_factor(4), .5::numeric, 'fourth matchup has half weight');
select is(private.anti_farming_factor(6), .5::numeric, 'sixth matchup has half weight');
select is(private.anti_farming_factor(7), 0::numeric, 'seventh matchup has zero weight');

select is(private.validate_match_sets('ranked'::public.match_mode, 11::smallint, 3::smallint, '[{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":12,"sideBPoints":10}]'::jsonb), 'A'::public.match_side, 'best-of-three winner is derived');
select is(private.validate_match_sets('ranked'::public.match_mode, 21::smallint, 5::smallint, '[{"sideAPoints":21,"sideBPoints":17},{"sideAPoints":19,"sideBPoints":21},{"sideAPoints":22,"sideBPoints":20},{"sideAPoints":21,"sideBPoints":10}]'::jsonb), 'A'::public.match_side, 'best-of-five winner is derived');
select is(private.validate_match_sets('unranked'::public.match_mode, null::smallint, null::smallint, '[{"sideAPoints":3,"sideBPoints":1}]'::jsonb), 'A'::public.match_side, 'unranked scores stay flexible');

select throws_ok($$ select private.validate_match_sets('ranked'::public.match_mode, 11::smallint, 3::smallint, '[{"sideAPoints":11,"sideBPoints":9}]'::jsonb) $$, '22023', 'insufficient_winning_sets', 'ranked match must reach required set wins');
select throws_ok($$ select private.validate_match_sets('ranked'::public.match_mode, 11::smallint, 3::smallint, '[{"sideAPoints":11,"sideBPoints":8},{"sideAPoints":11,"sideBPoints":7},{"sideAPoints":11,"sideBPoints":9}]'::jsonb) $$, '22023', 'sets_after_match_winner', 'sets after clinching are rejected');
select throws_ok($$ select private.validate_match_sets('ranked'::public.match_mode, 11::smallint, 3::smallint, '[{"sideAPoints":13,"sideBPoints":8},{"sideAPoints":11,"sideBPoints":7}]'::jsonb) $$, '22023', 'invalid_ranked_set', 'invalid ranked set score is rejected');
select throws_ok($$ select private.validate_match_sets('unranked'::public.match_mode, null::smallint, null::smallint, '[{"sideAPoints":1,"sideBPoints":1}]'::jsonb) $$, '22023', 'invalid_set_score', 'drawn sets are rejected');

select * from finish();
rollback;
