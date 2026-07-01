-- Public RPC wrappers must cross into the private schema without granting
-- authenticated clients direct access to private implementation functions.
alter function public.create_match_command(public.match_mode, public.match_type, smallint, smallint, uuid[]) security definer;
alter function public.submit_match_result_command(uuid, jsonb) security definer;
alter function public.confirm_match_result_command(uuid) security definer;
alter function public.cancel_match_command(uuid) security definer;
alter function public.dispute_match_command(uuid) security definer;

revoke execute on function private.create_match_command(public.match_mode, public.match_type, smallint, smallint, uuid[]) from authenticated;
revoke execute on function private.submit_match_result_command(uuid, jsonb) from authenticated;
revoke execute on function private.confirm_match_result_command(uuid) from authenticated;
revoke execute on function private.cancel_match_command(uuid) from authenticated;
revoke execute on function private.dispute_match_command(uuid) from authenticated;
