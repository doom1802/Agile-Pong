create extension if not exists pg_cron with schema extensions;

alter table public.matches
  add column auto_confirmed_at timestamptz;

alter table public.match_events
  add column automatic boolean not null default false;

create index matches_submitted_played_idx
  on public.matches (played_at)
  where status = 'submitted';

create or replace function private.process_overdue_match_confirmations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches%rowtype;
  v_submitter_side public.match_side;
  v_system_confirmer uuid;
  v_processed integer := 0;
begin
  for v_match in
    select match.*
    from public.matches match
    where match.status = 'submitted'
      and match.played_at <= now() - interval '24 hours'
    order by match.played_at
    for update skip locked
  loop
    begin
      select player.side
      into v_submitter_side
      from public.match_players player
      where player.match_id = v_match.id
        and player.user_id = v_match.submitted_by_user_id;

      select player.user_id
      into v_system_confirmer
      from public.match_players player
      where player.match_id = v_match.id
        and player.side <> v_submitter_side
      order by player.position, player.user_id
      limit 1;

      if v_system_confirmer is null then
        raise exception 'No opposite-side participant for match %', v_match.id;
      end if;

      -- Reuse the exact same locked transaction, validation and Elo path as a
      -- manual opposite-side confirmation.
      perform set_config('request.jwt.claim.sub', v_system_confirmer::text, true);
      perform private.confirm_match_result_command(v_match.id);

      update public.matches
      set confirmed_by_user_id = null,
          auto_confirmed_at = now()
      where id = v_match.id;

      update public.match_events
      set user_id = v_match.submitted_by_user_id,
          automatic = true
      where id = (
        select event.id
        from public.match_events event
        where event.match_id = v_match.id
          and event.type = 'confirmed'
        order by event.created_at desc, event.id desc
        limit 1
      );

      v_processed := v_processed + 1;
    exception when others then
      raise warning 'Unable to auto-confirm match %: %', v_match.id, sqlerrm;
    end;
  end loop;

  perform set_config('request.jwt.claim.sub', '', true);
  return v_processed;
end;
$$;

revoke all on function private.process_overdue_match_confirmations() from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'auto-confirm-overdue-matches';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'auto-confirm-overdue-matches',
    '*/15 * * * *',
    'select private.process_overdue_match_confirmations()'
  );
end;
$$;
