with active_season as (
  select id
  from public.seasons
  where now() >= starts_at and now() < ends_at
  order by starts_at desc
  limit 1
)
update public.seasons
set name = 'Open Season',
    ends_at = 'infinity'::timestamptz
where id = (select id from active_season);
