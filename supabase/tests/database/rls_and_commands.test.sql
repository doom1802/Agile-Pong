begin;
select plan(17);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'matches', 'matches exists');
select has_function('public', 'create_match_command', array['match_mode', 'match_type', 'smallint', 'smallint', 'uuid[]'], 'create RPC exists');
select has_function('public', 'submit_match_result_command', array['uuid', 'jsonb'], 'submit RPC exists');
select has_function('public', 'confirm_match_result_command', array['uuid'], 'confirm RPC exists');
select has_function('public', 'cancel_match_command', array['uuid'], 'cancel RPC exists');
select has_function('public', 'dispute_match_command', array['uuid'], 'dispute RPC exists');
select has_function('private', 'process_overdue_match_confirmations', array[]::text[], 'auto-confirm worker exists');
select has_column('public', 'matches', 'auto_confirmed_at', 'automatic confirmation is audited on matches');
select has_column('public', 'match_events', 'automatic', 'automatic confirmation is audited on events');

select policies_are('public', 'profiles', array['profiles_read_authenticated', 'profiles_update_self'], 'profile policies are explicit');
select policies_are('public', 'player_ratings', array['ratings_read_authenticated'], 'ratings are read-only through RLS');
select policies_are('public', 'matches', array['matches_read_authenticated'], 'matches are read-only through RLS');
select table_privs_are('public', 'matches', 'anon', array[]::text[], 'anonymous users have no match privileges');
select table_privs_are('public', 'matches', 'authenticated', array['SELECT'], 'authenticated users cannot write matches directly');

select ok(
  case
    when to_regprocedure('public.rls_auto_enable()') is null then true
    else not has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
  end,
  'anonymous users cannot execute the RLS administration helper'
);
select ok(
  case
    when to_regprocedure('public.rls_auto_enable()') is null then true
    else not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute')
  end,
  'authenticated users cannot execute the RLS administration helper'
);

select * from finish();
rollback;
