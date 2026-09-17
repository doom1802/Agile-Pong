-- Quick Insert lists only the public-facing player fields through the
-- server-side service role. Keep email and the remaining profile fields out.
grant select (id, first_name, last_name, nickname)
  on public.profiles
  to service_role;
