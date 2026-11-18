-- READ ONLY. Run against the existing Station Live project as an administrator.
-- Export the result sets for review before preparing/applying the feature migration.
-- This does not return message text, attachment URLs, credentials or JWTs.
begin transaction read only;

select current_database() as database_name, current_timestamp as audited_at;

select table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('chat_messages', 'chat_message_reactions', 'chat_cleanup_settings')
order by table_name, ordinal_position;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('chat_messages', 'chat_message_reactions', 'chat_cleanup_settings');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('chat_messages', 'chat_message_reactions'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('chat_messages', 'chat_message_reactions')
order by table_name, grantee, privilege_type;

select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename in ('chat_messages', 'chat_message_reactions')
order by tablename, indexname;

select c.conrelid::regclass as table_name, c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid in (to_regclass('public.chat_messages'), to_regclass('public.chat_message_reactions'))
   or c.confrelid = to_regclass('public.chat_messages')
order by table_name, c.conname;

select t.tgrelid::regclass as table_name, t.tgname,
       pg_get_triggerdef(t.oid) as definition, t.tgfoid::regprocedure as handler
from pg_trigger t
where not t.tgisinternal and t.tgrelid in (
  to_regclass('public.chat_messages'), to_regclass('public.chat_message_reactions'))
order by table_name, t.tgname;

-- Inspect exact trigger/rate-limit/search implementations; definitions may differ
-- from the repository. Review privately before sharing any custom function source.
select p.oid::regprocedure as function_name, p.prosecdef as security_definer,
       p.proconfig as configuration, p.proacl as grants,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (
  p.proname like 'chat\_%' escape '\'
  or p.proname like '%chatter%'
  or p.oid in (
    select t.tgfoid from pg_trigger t
    where not t.tgisinternal and t.tgrelid in (
      to_regclass('public.chat_messages'), to_regclass('public.chat_message_reactions'))
  ))
order by function_name;

select extname, extversion from pg_extension
where extname in ('pg_trgm', 'pg_cron', 'pg_net', 'pg_stat_statements');

select pg_size_pretty(pg_database_size(current_database())) as database_size;
select relname, n_live_tup as estimated_rows from pg_stat_user_tables
where schemaname = 'public' and relname in ('chat_messages', 'chat_message_reactions');
select id, public, file_size_limit, allowed_mime_types from storage.buckets
where id in ('chat-images', 'chat-videos');

-- Check the Dashboard separately for the current plan, usage, anonymous-auth
-- configuration, deployed cleanup schedule and active moderation settings.
-- Do not export scheduled job command text; it can contain credentials.
commit;
