-- Isolated throwaway database ONLY. This creates mock Supabase roles/schema.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role', true) $$;
create table public.chat_messages(id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), image_url text, video_url text);
create table public.reports(id integer primary key, payload jsonb);
create table public.station_updates(id integer primary key, message text);
create table public.report_lines(id integer primary key, report_count integer);
\ir ../supabase/migrations/20261116000000_chatter_retention.sql
insert into public.chat_messages values
 ('00000000-0000-4000-8000-000000000001', now()-interval '23 hours 59 minutes',null,null),
 ('00000000-0000-4000-8000-000000000002', now()-interval '24 hours 1 minute','https://test.supabase.co/storage/v1/object/public/chat-images/shared.png',null);
insert into public.reports values (1,'{"attachment":"shared%2Epng"}');
insert into public.station_updates values(1,'preserve');
insert into public.report_lines values(1,20);
do $$ begin
  if jsonb_array_length(public.chat_cleanup_batch(true)->'candidates')<>1 then raise exception '24h boundary preview failed'; end if;
  if (select count(*) from public.chat_messages)<>2 then raise exception 'Dry run mutated messages'; end if;
  begin
    perform public.chat_cleanup_batch(false);
    raise exception 'Disabled cleanup ran';
  exception when raise_exception then
    if SQLERRM <> 'Cleanup is disabled' then raise; end if;
  end;
end $$;
update public.chat_cleanup_settings set enabled=true, media_ownership_confirmed=true;
select public.chat_cleanup_batch(false);
do $$ begin
  if (select count(*) from public.chat_messages)<>1 or (select count(*) from public.chat_cleanup_queue)<>1 then raise exception 'Queue/delete boundary failed'; end if;
  if (select report_count from public.report_lines where id=1)<>20 or (select count(*) from public.station_updates)<>1 then raise exception 'Reporting data changed'; end if;
end $$;
insert into public.chat_cleanup_objects(bucket,object_name) values('chat-images','shared.png');
do $$ begin
  if public.chat_cleanup_claim('chat-images','shared.png') then raise exception 'Shared report attachment claimed'; end if;
end $$;
delete from public.reports where id=1;
do $$ begin
  if not public.chat_cleanup_claim('chat-images','shared.png') then raise exception 'Unused media not claimed'; end if;
  begin
    insert into public.reports values (2,'{"attachment":"shared%2epng"}');
    raise exception 'Concurrent/new retired reference accepted';
  exception when check_violation then null; end;
  if not public.chat_cleanup_claim('chat-images','shared.png') then raise exception 'Interrupted claim not retryable'; end if;
end $$;
update public.chat_cleanup_objects set state='deleted';
do $$ begin
  if public.chat_cleanup_claim('chat-images','shared.png') then raise exception 'Deleted object reclaimed'; end if;
  begin
    insert into public.chat_messages(image_url) values('shared.png');
    raise exception 'Deleted object reused';
  exception when check_violation then null; end;
end $$;
-- Adding an unguarded public table must stop media claims.
create table public.new_reference_table(url text);
insert into public.chat_cleanup_objects(bucket,object_name) values('chat-images','another.png');
do $$ begin
  begin
    perform public.chat_cleanup_claim('chat-images','another.png');
    raise exception 'Missing guard accepted';
  exception when raise_exception then
    if SQLERRM <> 'Reference guard missing on a public table' then raise; end if;
  end;
  if has_function_privilege('anon','public.chat_cleanup_batch(boolean)','execute') then raise exception 'Anonymous cleanup permitted'; end if;
  if has_table_privilege('authenticated','public.chat_cleanup_queue','select') then raise exception 'Private queue exposed'; end if;
end $$;
-- Client timestamps cannot backdate a new message.
set request.jwt.claim.role='anon';
insert into public.chat_messages(id,created_at) values('00000000-0000-4000-8000-000000000003',now()-interval '7 days');
reset request.jwt.claim.role;
do $$ declare token uuid; begin
  if (select created_at < now()-interval '1 minute' from public.chat_messages where id='00000000-0000-4000-8000-000000000003') then raise exception 'Client timestamp not trusted'; end if;
  token:=public.chat_cleanup_worker();
  if token is null or public.chat_cleanup_worker() is not null then raise exception 'Worker overlap lock failed'; end if;
  perform public.chat_cleanup_worker(token);
end $$;
select 'Chatter database checks passed' as result;
