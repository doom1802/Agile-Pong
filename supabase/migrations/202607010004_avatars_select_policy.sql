-- The avatars bucket is public, but storage.objects RLS still requires an explicit
-- SELECT policy: upsert uploads run as INSERT ... ON CONFLICT DO UPDATE, and Postgres
-- needs SELECT access under RLS to evaluate the conflict target. Without it, uploads
-- fail with "new row violates row-level security policy for table objects" even when
-- the INSERT/UPDATE policies are otherwise satisfied.
create policy avatars_select_public
on storage.objects for select
to public
using (bucket_id = 'avatars');
