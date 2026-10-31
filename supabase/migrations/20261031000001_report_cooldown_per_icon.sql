-- Each station/category is an independent toggle. Re-selecting within the
-- 30-minute window restores the same report instead of increasing its count.
begin;
create table public.station_report_icon_submissions (
  reporter_key text not null,
  location_key text not null,
  category text not null,
  report_id uuid references public.station_updates(id) on delete set null,
  next_allowed_at timestamptz not null default now(),
  undone boolean not null default false,
  primary key (reporter_key, location_key, category)
);
alter table public.station_report_icon_submissions enable row level security;
revoke all on public.station_report_icon_submissions from public, anon, authenticated;

-- Preserve the existing selections and the original start of their window.
insert into public.station_report_icon_submissions (reporter_key, location_key, category, report_id, next_allowed_at, undone)
select s.reporter_key,
  case when nullif(btrim(r.station_name), '') is not null then 'station:' || lower(btrim(r.station_name))
    else 'location:' || lower(btrim(r.location_text)) end,
  r.category, r.id, s.next_allowed_at, s.undone
from public.station_report_submissions s join public.station_updates r on r.id = s.report_id
where s.next_allowed_at > now() and r.category is not null
  and coalesce(nullif(btrim(r.station_name), ''), nullif(btrim(r.location_text), '')) is not null;

create or replace function public.get_station_report_submission(p_guest_token uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('report', to_jsonb(r), 'next_allowed_at', s.next_allowed_at, 'undone', s.undone)), '[]'::jsonb)
  from public.station_report_icon_submissions s join public.station_updates r on r.id = s.report_id
  where s.reporter_key = public.station_reporter_key(p_guest_token) and s.next_allowed_at > now();
$$;

create or replace function public.submit_station_report(p_guest_token uuid, p_report jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  identity_key text := public.station_reporter_key(p_guest_token);
  icon_location text;
  icon_category text := nullif(btrim(p_report->>'category'), '');
  submission public.station_report_icon_submissions;
  saved public.station_updates;
begin
  if nullif(btrim(p_report->>'station_name'), '') is not null then
    icon_location := 'station:' || lower(btrim(p_report->>'station_name'));
  elsif nullif(btrim(p_report->>'location_text'), '') is not null then
    icon_location := 'location:' || lower(btrim(p_report->>'location_text'));
  else raise exception 'Add a location for this report.';
  end if;
  if icon_category is null then raise exception 'Select an issue to report.'; end if;
  insert into public.station_report_icon_submissions (reporter_key, location_key, category)
  values (identity_key, icon_location, icon_category) on conflict do nothing;
  select * into submission from public.station_report_icon_submissions
    where reporter_key = identity_key and location_key = icon_location and category = icon_category for update;

  if submission.next_allowed_at > clock_timestamp() then
    select * into saved from public.station_updates where id = submission.report_id for update;
    if not found or saved.status = 'EXPIRED' or (saved.status = 'RESOLVED' and not submission.undone) then
      raise exception 'This report is no longer active. Please wait until its 30-minute window ends.';
    end if;
    if submission.undone then
      update public.station_updates set status = case when confirms >= 3 then 'CONFIRMED' else 'ACTIVE' end, updated_at = now()
        where id = submission.report_id returning * into saved;
      update public.station_report_icon_submissions set undone = false
        where reporter_key = identity_key and location_key = icon_location and category = icon_category;
    end if;
    -- Duplicate submissions return the same row without adding another report.
    return jsonb_build_object('report', to_jsonb(saved), 'next_allowed_at', submission.next_allowed_at, 'undone', false);
  end if;

  insert into public.station_updates (station_name, location_text, kind, category, label, tone, message, where_on, author_id, author_initial)
  values (nullif(btrim(p_report->>'station_name'), ''), p_report->>'location_text', 'report', icon_category, p_report->>'label',
    p_report->>'tone', p_report->>'message', p_report->>'where_on', auth.uid(),
    coalesce(nullif(upper(left(auth.jwt()->>'email', 1)), ''), 'A')) returning * into saved;
  update public.station_report_icon_submissions set report_id = saved.id, next_allowed_at = clock_timestamp() + interval '30 minutes', undone = false
    where reporter_key = identity_key and location_key = icon_location and category = icon_category
    returning * into submission;
  return jsonb_build_object('report', to_jsonb(saved), 'next_allowed_at', submission.next_allowed_at, 'undone', false);
end;
$$;

drop function public.undo_station_report(uuid);
create function public.undo_station_report(p_guest_token uuid, p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  identity_key text := public.station_reporter_key(p_guest_token);
  submission public.station_report_icon_submissions;
  saved public.station_updates;
begin
  select * into submission from public.station_report_icon_submissions
    where reporter_key = identity_key and report_id = p_report_id for update;
  if not found then raise exception 'No report to deselect.'; end if;
  if submission.next_allowed_at <= clock_timestamp() then raise exception 'The 30-minute selection window has ended.'; end if;
  if not submission.undone then
    update public.station_updates set status = 'RESOLVED', updated_at = now()
      where id = submission.report_id and status in ('ACTIVE', 'CONFIRMED');
    update public.station_report_icon_submissions set undone = true
      where reporter_key = identity_key and location_key = submission.location_key and category = submission.category;
  end if;
  select * into saved from public.station_updates where id = submission.report_id;
  return jsonb_build_object('report', to_jsonb(saved), 'next_allowed_at', submission.next_allowed_at, 'undone', true);
end;
$$;
revoke all on function public.undo_station_report(uuid, uuid) from public;
grant execute on function public.undo_station_report(uuid, uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
