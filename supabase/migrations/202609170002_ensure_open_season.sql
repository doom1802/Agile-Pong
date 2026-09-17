-- Keep one season available even when a fresh environment is created after
-- the originally seeded season windows have elapsed.
do $$
declare
  v_open_season_id uuid;
begin
  select id
  into v_open_season_id
  from public.seasons
  where name = 'Open Season'
  limit 1;

  if v_open_season_id is null then
    select id
    into v_open_season_id
    from public.seasons
    order by starts_at desc
    limit 1;

    if v_open_season_id is null then
      insert into public.seasons (name, starts_at, ends_at)
      values ('Open Season', now(), 'infinity'::timestamptz)
      returning id into v_open_season_id;
    else
      update public.seasons
      set name = 'Open Season',
          ends_at = 'infinity'::timestamptz
      where id = v_open_season_id;
    end if;
  else
    update public.seasons
    set ends_at = 'infinity'::timestamptz
    where id = v_open_season_id;
  end if;
end;
$$;
