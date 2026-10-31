-- One report per account (or private guest browser token) every 30 minutes.
-- Undo resolves the report but deliberately retains the cooldown.
begin;
create table public.station_report_submissions (
  reporter_key text primary key,
  report_id uuid references public.station_updates(id) on delete set null,
  next_allowed_at timestamptz not null default now(),
  undone boolean not null default false
);
alter table public.station_report_submissions enable row level security;
revoke all on public.station_report_submissions from public, anon, authenticated;

create function public.station_reporter_key(p_guest_token uuid)
returns text language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is not null then return 'user:' || auth.uid()::text; end if;
  if p_guest_token is null then raise exception 'A guest token is required.'; end if;
  return 'guest:' || encode(sha256(p_guest_token::text::bytea), 'hex');
end;
$$;
revoke all on function public.station_reporter_key(uuid) from public, anon, authenticated;

create function public.get_station_report_submission(p_guest_token uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('report', to_jsonb(r), 'next_allowed_at', s.next_allowed_at, 'undone', s.undone)
  from public.station_report_submissions s
  left join public.station_updates r on r.id = s.report_id
  where s.reporter_key = public.station_reporter_key(p_guest_token);
$$;

create function public.submit_station_report(p_guest_token uuid, p_report jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  identity_key text := public.station_reporter_key(p_guest_token);
  submission public.station_report_submissions;
  saved_id uuid;
begin
  if nullif(btrim(p_report->>'station_name'), '') is null and nullif(btrim(p_report->>'location_text'), '') is null then
    raise exception 'Add a location for this report.';
  end if;
  if nullif(btrim(p_report->>'category'), '') is null then raise exception 'Select an issue to report.'; end if;
  insert into public.station_report_submissions (reporter_key) values (identity_key) on conflict do nothing;
  select * into submission from public.station_report_submissions where reporter_key = identity_key for update;
  if submission.next_allowed_at > clock_timestamp() then
    raise exception 'Please wait 30 minutes between reports. You can still undo your last report.';
  end if;
  insert into public.station_updates (station_name, location_text, kind, category, label, tone, message, where_on, author_id, author_initial)
  values (p_report->>'station_name', p_report->>'location_text', 'report', p_report->>'category', p_report->>'label',
    p_report->>'tone', p_report->>'message', p_report->>'where_on', auth.uid(),
    coalesce(nullif(upper(left(auth.jwt()->>'email', 1)), ''), 'A'))
  returning id into saved_id;
  update public.station_report_submissions set report_id = saved_id, next_allowed_at = clock_timestamp() + interval '30 minutes', undone = false
  where reporter_key = identity_key;
  return public.get_station_report_submission(p_guest_token);
end;
$$;

create function public.undo_station_report(p_guest_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  identity_key text := public.station_reporter_key(p_guest_token);
  submission public.station_report_submissions;
begin
  select * into submission from public.station_report_submissions where reporter_key = identity_key for update;
  if not found or submission.report_id is null then raise exception 'No report to undo.'; end if;
  if submission.next_allowed_at <= clock_timestamp() then raise exception 'The 30-minute undo window has ended.'; end if;
  update public.station_updates set status = 'RESOLVED', updated_at = now()
  where id = submission.report_id and status in ('ACTIVE', 'CONFIRMED');
  update public.station_report_submissions set undone = true where reporter_key = identity_key;
  return public.get_station_report_submission(p_guest_token);
end;
$$;

-- Prevent direct writes from bypassing the rate limit or restoring an undone report.
drop policy if exists "Anyone can post station reports" on public.station_updates;
revoke update, delete on public.station_updates from public, anon, authenticated;
revoke all on function public.get_station_report_submission(uuid) from public;
revoke all on function public.submit_station_report(uuid, jsonb) from public;
revoke all on function public.undo_station_report(uuid) from public;
grant execute on function public.get_station_report_submission(uuid) to anon, authenticated;
grant execute on function public.submit_station_report(uuid, jsonb) to anon, authenticated;
grant execute on function public.undo_station_report(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
