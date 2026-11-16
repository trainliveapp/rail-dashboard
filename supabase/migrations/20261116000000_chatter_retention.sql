-- Run in Dashboard > SQL Editor after chat-cleanup-audit.sql.
-- Installs infrastructure only: no deletion and no schedule are activated.
begin;
create table if not exists public.chat_cleanup_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  media_ownership_confirmed boolean not null default false
);
alter table public.chat_cleanup_settings add column if not exists worker_token uuid;
alter table public.chat_cleanup_settings add column if not exists worker_until timestamptz;
insert into public.chat_cleanup_settings(singleton) values (true) on conflict do nothing;

-- Durable snapshots survive message deletion and interrupted workers.
create table if not exists public.chat_cleanup_queue (
  message_id uuid primary key,
  image_url text,
  video_url text,
  queued_at timestamptz not null default now()
);
alter table public.chat_cleanup_queue add column if not exists retry_after timestamptz not null default now();
alter table public.chat_cleanup_queue add column if not exists error_code text;
create table if not exists public.chat_cleanup_objects (
  bucket text not null check (bucket in ('chat-images', 'chat-videos')),
  object_name text not null check (object_name ~ '^[a-zA-Z0-9._/-]+$' and length(object_name) > 0),
  state text not null default 'pending' check (state in ('pending', 'deleting', 'deleted')),
  attempts integer not null default 0,
  retry_after timestamptz not null default now(),
  error_code text,
  primary key (bucket, object_name)
);
-- Keep deleted tombstones: the old URL must never be attached to a new post.
alter table public.chat_cleanup_settings enable row level security;
alter table public.chat_cleanup_queue enable row level security;
alter table public.chat_cleanup_objects enable row level security;
revoke all on public.chat_cleanup_settings, public.chat_cleanup_queue, public.chat_cleanup_objects from public, anon, authenticated;
grant all on public.chat_cleanup_settings, public.chat_cleanup_queue, public.chat_cleanup_objects to service_role;
create index if not exists chat_messages_cleanup_created_at on public.chat_messages(created_at);

create or replace function public.chat_cleanup_worker(p_token uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare token uuid;
begin
  if p_token is not null then
    update public.chat_cleanup_settings set worker_token=null, worker_until=null
      where singleton and worker_token=p_token;
    return null;
  end if;
  update public.chat_cleanup_settings set worker_token=gen_random_uuid(), worker_until=now()+interval '15 minutes'
    where singleton and (worker_until is null or worker_until < now()) returning worker_token into token;
  return token;
end $$;

create or replace function public.chat_cleanup_timestamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if TG_OP = 'INSERT' then NEW.created_at := clock_timestamp();
    else NEW.created_at := OLD.created_at; end if;
  end if;
  return NEW;
end $$;
drop trigger if exists chat_cleanup_timestamp on public.chat_messages;
create trigger chat_cleanup_timestamp before insert or update on public.chat_messages
for each row execute function public.chat_cleanup_timestamp();

-- Serialize reference creation with claims. Check the entire row (including JSON).
-- Names are intentionally restricted to the ASCII paths emitted by this client.
-- Matching the filename alone is conservative: false matches retain extra media.
create or replace function public.chat_cleanup_normalize(p_text text) returns text
language plpgsql immutable set search_path = '' as $$
declare i integer;
begin
  -- Detect equivalent percent-encoded URLs as well as raw object paths.
  for i in 45..122 loop
    if chr(i) ~ '^[a-zA-Z0-9._/-]$' then
      p_text := regexp_replace(p_text, '%' || lpad(to_hex(i),2,'0'), chr(i), 'gi');
    end if;
  end loop;
  return p_text;
end $$;

create or replace function public.chat_cleanup_reference_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(61116001);
  if exists (
    select 1 from public.chat_cleanup_objects o
    where o.state in ('deleting', 'deleted')
      and strpos(public.chat_cleanup_normalize(to_jsonb(NEW)::text), o.object_name) > 0
  ) then
    raise exception 'Attachment is retired; upload a new file' using errcode = '23514';
  end if;
  return NEW;
end $$;

-- Protect every existing public application table, including report JSON columns.
-- Re-run this block after adding a public table. Claims fail closed if it is absent.
do $$ declare t record; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relname not like 'chat_cleanup_%'
  loop
    execute format('drop trigger if exists chat_cleanup_reference_guard on public.%I', t.relname);
    execute format('create trigger chat_cleanup_reference_guard before insert or update on public.%I for each row execute function public.chat_cleanup_reference_guard()', t.relname);
  end loop;
end $$;

create or replace function public.chat_cleanup_batch(p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n integer; preview jsonb;
begin
  perform pg_advisory_xact_lock(61116001);
  if p_dry_run then
    select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into preview from (
      select id, created_at, image_url, video_url from public.chat_messages
      where created_at < now() - interval '24 hours' order by created_at, id limit 100
    ) m;
    return jsonb_build_object('dry_run', true, 'candidates', preview);
  end if;
  if not (select enabled from public.chat_cleanup_settings where singleton) then
    raise exception 'Cleanup is disabled';
  end if;
  with candidates as (
    select id, image_url, video_url from public.chat_messages
    where created_at < now() - interval '24 hours'
    order by created_at, id limit 100 for update
  ), queued as (
    insert into public.chat_cleanup_queue(message_id, image_url, video_url)
    select id, image_url, video_url from candidates
    on conflict(message_id) do update set image_url=excluded.image_url, video_url=excluded.video_url
    returning message_id
  )
  delete from public.chat_messages m using queued q where m.id=q.message_id;
  get diagnostics n = row_count;
  return jsonb_build_object('dry_run', false, 'messages_removed', n);
end $$;

-- Claims are durable (no lease expiry), so an interrupted Storage request cannot
-- race a new reference. Retrying a claim repeats the same idempotent API delete.
create or replace function public.chat_cleanup_claim(p_bucket text, p_name text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare t record; referenced boolean; current_state text;
begin
  perform pg_advisory_xact_lock(61116001);
  if not exists (select 1 from public.chat_cleanup_settings where singleton and enabled and media_ownership_confirmed) then
    return false;
  end if;
  select state into current_state from public.chat_cleanup_objects
    where bucket=p_bucket and object_name=p_name for update;
  if current_state is null or current_state='deleted' then return false; end if;
  for t in select c.oid, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r', 'p') and c.relname not like 'chat_cleanup_%'
  loop
    if not exists (select 1 from pg_trigger where tgrelid=t.oid and tgname='chat_cleanup_reference_guard' and tgenabled='O') then
      raise exception 'Reference guard missing on a public table';
    end if;
    execute format('select exists(select 1 from public.%I r where strpos(public.chat_cleanup_normalize(to_jsonb(r)::text), $1)>0)', t.relname)
      into referenced using p_name;
    if referenced then
      update public.chat_cleanup_objects set retry_after=now()+interval '15 minutes'
        where bucket=p_bucket and object_name=p_name;
      return false;
    end if;
  end loop;
  update public.chat_cleanup_objects set state='deleting', attempts=attempts+1,
    retry_after=now()+interval '15 minutes', error_code=null
    where bucket=p_bucket and object_name=p_name;
  return true;
end $$;

-- Default PUBLIC function EXECUTE is unsafe for privileged RPCs.
revoke all on function public.chat_cleanup_batch(boolean), public.chat_cleanup_claim(text,text),
  public.chat_cleanup_worker(uuid), public.chat_cleanup_reference_guard(), public.chat_cleanup_timestamp() from public, anon, authenticated;
grant execute on function public.chat_cleanup_batch(boolean), public.chat_cleanup_claim(text,text), public.chat_cleanup_worker(uuid) to service_role;
notify pgrst, 'reload schema';
commit;
