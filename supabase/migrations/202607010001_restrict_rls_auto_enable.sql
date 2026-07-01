-- Supabase-managed projects may expose this event-trigger helper in public.
-- It is administrative infrastructure and must never be callable through the API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
