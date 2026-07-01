-- Profiles start with an empty nickname and complete it during onboarding.
-- Once chosen, nicknames are unique regardless of casing or surrounding spaces.
create unique index profiles_nickname_unique_ci
  on public.profiles (lower(btrim(nickname)))
  where btrim(nickname) <> '';
