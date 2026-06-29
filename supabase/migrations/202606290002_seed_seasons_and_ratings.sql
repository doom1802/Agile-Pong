insert into public.seasons (name, starts_at, ends_at)
values
  ('2026 May-Jun', '2026-05-01 00:00:00+00', '2026-07-01 00:00:00+00'),
  ('2026 Jul-Aug', '2026-07-01 00:00:00+00', '2026-09-01 00:00:00+00')
on conflict (name) do nothing;

insert into public.player_ratings (season_id, user_id)
select season.id, profile.id
from public.profiles profile
cross join public.seasons season
where now() >= season.starts_at
  and now() < season.ends_at
on conflict (season_id, user_id) do nothing;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) !~ '@agilelab[.]it$' then
    raise exception 'Email domain is not allowed';
  end if;

  insert into public.profiles (id, email)
  values (new.id, lower(new.email));

  insert into private.app_roles (user_id)
  values (new.id);

  insert into public.player_ratings (season_id, user_id)
  select season.id, new.id
  from public.seasons season
  where now() >= season.starts_at
    and now() < season.ends_at
  on conflict (season_id, user_id) do nothing;

  return new;
end;
$$;
