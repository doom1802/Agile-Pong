create extension if not exists pgcrypto;

create type public.match_mode as enum ('ranked', 'unranked');
create type public.match_type as enum ('singles', 'doubles');
create type public.match_status as enum ('ready', 'submitted', 'confirmed', 'disputed', 'cancelled');
create type public.match_side as enum ('A', 'B');
create type public.rating_kind as enum ('singles', 'doubles', 'none');
create type public.match_event_type as enum (
  'created', 'submitted', 'confirmed', 'disputed', 'cancelled', 'admin_edited', 'admin_deleted'
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  nickname text not null default '',
  avatar_url text not null default '',
  office_location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email)),
  constraint profiles_nickname_length check (char_length(nickname) <= 40),
  constraint profiles_name_length check (
    char_length(first_name) <= 80 and char_length(last_name) <= 80
  ),
  constraint profiles_office_length check (char_length(office_location) <= 120)
);

create table private.app_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint seasons_valid_range check (starts_at < ends_at)
);

create unique index seasons_single_active_window
  on public.seasons (starts_at, ends_at);

create table public.player_ratings (
  season_id uuid not null references public.seasons(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  singles_rating integer not null default 1000 check (singles_rating >= 0),
  doubles_rating integer not null default 1000 check (doubles_rating >= 0),
  singles_ranked_matches integer not null default 0 check (singles_ranked_matches >= 0),
  doubles_ranked_matches integer not null default 0 check (doubles_ranked_matches >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  mode public.match_mode not null,
  type public.match_type not null,
  status public.match_status not null default 'ready',
  points_to_win smallint,
  best_of smallint,
  winner_side public.match_side,
  played_at timestamptz,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  rating_applied boolean not null default false,
  anti_farming_factor numeric(4,3) not null default 1 check (anti_farming_factor between 0 and 1),
  submitted_by_user_id uuid references public.profiles(id) on delete restrict,
  confirmed_by_user_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_ranked_format check (
    (mode = 'ranked' and points_to_win in (11, 21) and best_of in (3, 5) and season_id is not null)
    or mode = 'unranked'
  ),
  constraint matches_rating_only_once check (not rating_applied or status = 'confirmed')
);

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  side public.match_side not null,
  position smallint not null check (position in (1, 2)),
  rating_kind public.rating_kind not null,
  rating_before integer,
  rating_after integer,
  rating_delta integer,
  primary key (match_id, user_id),
  unique (match_id, side, position)
);

create table public.match_sets (
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number smallint not null check (set_number > 0),
  side_a_points smallint not null check (side_a_points >= 0),
  side_b_points smallint not null check (side_b_points >= 0),
  primary key (match_id, set_number),
  constraint match_sets_no_draw check (side_a_points <> side_b_points)
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  type public.match_event_type not null,
  created_at timestamptz not null default now()
);

create index match_players_user_id_idx on public.match_players(user_id);
create index matches_created_at_idx on public.matches(created_at desc);
create index matches_status_idx on public.matches(status);
create index match_events_match_id_idx on public.match_events(match_id, created_at);
create index player_ratings_user_id_idx on public.player_ratings(user_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger ratings_set_updated_at
before update on public.player_ratings
for each row execute function private.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function private.set_updated_at();

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

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.player_ratings enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_sets enable row level security;
alter table public.match_events enable row level security;

create policy profiles_read_authenticated
on public.profiles for select to authenticated
using (true);

create policy profiles_update_self
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy seasons_read_authenticated
on public.seasons for select to authenticated
using (true);

create policy ratings_read_authenticated
on public.player_ratings for select to authenticated
using (true);

create policy matches_read_authenticated
on public.matches for select to authenticated
using (true);

create policy match_players_read_authenticated
on public.match_players for select to authenticated
using (true);

create policy match_sets_read_authenticated
on public.match_sets for select to authenticated
using (true);

create policy match_events_read_authenticated
on public.match_events for select to authenticated
using (true);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.seasons, public.player_ratings, public.matches,
  public.match_players, public.match_sets, public.match_events to authenticated;
grant update (first_name, last_name, nickname, avatar_url, office_location)
  on public.profiles to authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
