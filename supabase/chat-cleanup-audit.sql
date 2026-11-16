-- Read-only preflight. Run in the intended project's SQL editor as an administrator.
-- Inspect schema before using the preview queries below if production differs.
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('chat_messages', 'station_updates', 'reports', 'report_lines')
order by table_name, ordinal_position;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id in ('chat-images', 'chat-videos');

select extname from pg_extension where extname in ('pg_cron', 'pg_net');
-- Policies and custom triggers must be reviewed before installing cleanup.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public','storage') order by tablename, policyname;
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers where trigger_schema='public' order by event_object_table, trigger_name;
-- Inspect cascades: deletion must never cascade into reporting/history tables.
select conrelid::regclass as referencing_table, confrelid::regclass as referenced_table,
  pg_get_constraintdef(oid) as definition
from pg_constraint where contype='f' and confrelid='public.chat_messages'::regclass;
-- Find ALL public tables/columns that may hold other attachment references.
select table_name, column_name, data_type from information_schema.columns
where table_schema='public' and data_type in ('text','character varying','json','jsonb','ARRAY')
order by table_name, ordinal_position;
-- Run separately only if pg_cron is installed; do not share job commands/secrets.
-- select jobid, schedule, active from cron.job;

select pg_size_pretty(pg_database_size(current_database())) as database_size;
select bucket_id, count(*) as objects,
  sum(coalesce((metadata->>'size')::bigint, 0)) as bytes
from storage.objects group by bucket_id;

-- UTC-aware timestamptz comparison; no message content or user identity returned.
select count(*) as expired_messages,
  count(*) filter (where image_url is not null) as image_references,
  count(*) filter (where video_url is not null) as video_references,
  min(created_at) as oldest, max(created_at) as newest_expired
from public.chat_messages where created_at < now() - interval '24 hours';

-- Exact message candidates for founder review. Attachment URLs should be inspected
-- privately, not copied into application logs.
select id, created_at, image_url, video_url
from public.chat_messages where created_at < now() - interval '24 hours'
order by created_at, id;
