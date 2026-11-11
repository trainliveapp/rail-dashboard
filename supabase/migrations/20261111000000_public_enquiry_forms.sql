-- Private storage: no browser role can read subscriber addresses or rate-limit keys.
create table public.flavio_notifications (
  email text primary key check (email = lower(trim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'),
  consent_version text not null default 'flavio-launch-only-v1',
  consented_at timestamptz not null default now()
);
create table public.form_rate_limits (
  kind text not null, ip_hash text not null, bucket timestamptz not null, attempts integer not null default 1,
  primary key (kind, ip_hash, bucket)
);
alter table public.flavio_notifications enable row level security;
alter table public.form_rate_limits enable row level security;
revoke all on public.flavio_notifications, public.form_rate_limits from anon, authenticated;
grant all on public.flavio_notifications, public.form_rate_limits to service_role;

create or replace function public.consume_form_limit(p_kind text, p_ip_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare attempt_count integer;
begin
  if p_ip_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into public.form_rate_limits(kind, ip_hash, bucket)
  values(p_kind, p_ip_hash, date_trunc('hour', now()))
  on conflict(kind, ip_hash, bucket) do update set attempts = form_rate_limits.attempts + 1
  returning attempts into attempt_count;
  return attempt_count <= 5;
end;
$$;
revoke all on function public.consume_form_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_form_limit(text, text) to service_role;

create or replace function public.submit_flavio_notification(p_email text, p_ip_hash text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.consume_form_limit('notify', p_ip_hash) then return 'rate_limited'; end if;
  insert into public.flavio_notifications(email) values(lower(trim(p_email))) on conflict(email) do nothing;
  return 'success';
end;
$$;
revoke all on function public.submit_flavio_notification(text, text) from public, anon, authenticated;
grant execute on function public.submit_flavio_notification(text, text) to service_role;

create table public.advertising_enquiries (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique check (fingerprint ~ '^[a-f0-9]{64}$'),
  email text not null check (email = lower(trim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'),
  company text not null check (length(company) between 2 and 120),
  message text not null check (length(message) between 20 and 4000),
  consent_version text not null default 'advertising-response-only-v1',
  consented_at timestamptz not null default now(),
  delivered_at timestamptz,
  delivery_receipt text
);
alter table public.advertising_enquiries enable row level security;
revoke all on public.advertising_enquiries from anon, authenticated;
grant all on public.advertising_enquiries to service_role;

create or replace function public.prepare_advertising_enquiry(p_email text, p_company text, p_message text, p_ip_hash text, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare enquiry public.advertising_enquiries;
begin
  if not public.consume_form_limit('advertising', p_ip_hash) then return jsonb_build_object('state', 'rate_limited'); end if;
  insert into public.advertising_enquiries(fingerprint, email, company, message)
  values(p_fingerprint, lower(trim(p_email)), p_company, p_message)
  on conflict(fingerprint) do update set fingerprint = excluded.fingerprint
  returning * into enquiry;
  return jsonb_build_object('id', enquiry.id, 'state', case when enquiry.delivered_at is null then 'pending' else 'sent' end);
end;
$$;
revoke all on function public.prepare_advertising_enquiry(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.prepare_advertising_enquiry(text, text, text, text, text) to service_role;
notify pgrst, 'reload schema';
