-- Run ONLY AFTER staging tests, private dry-run review, and cost/owner approval.
-- First enable pg_cron, pg_net and Vault in Dashboard > Database > Extensions.
-- In Vault create two secrets using the Dashboard (do not paste secrets into Git):
-- chat_cleanup_url    = https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-cleanup
-- chat_cleanup_secret = the same random secret as Edge Function CHAT_CLEANUP_SECRET
-- This script creates an INACTIVE job. It makes no HTTP requests yet.
begin;
do $$ begin
  if not exists (select 1 from vault.decrypted_secrets where name='chat_cleanup_url')
    or not exists (select 1 from vault.decrypted_secrets where name='chat_cleanup_secret') then
    raise exception 'Create the two cleanup Vault secrets first';
  end if;
end $$;
select cron.schedule('station-live-chat-cleanup', '*/15 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='chat_cleanup_url'),
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cleanup-secret',(select decrypted_secret from vault.decrypted_secrets where name='chat_cleanup_secret')),
    body := '{"dry_run":false}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
select cron.alter_job(jobid, active := false)
from cron.job where jobname='station-live-chat-cleanup';
commit;

-- AFTER approval, run these separately to activate:
-- update public.chat_cleanup_settings set enabled=true, media_ownership_confirmed=true where singleton;
-- select cron.alter_job(jobid, active := true) from cron.job where jobname='station-live-chat-cleanup';

-- Pause immediately (references/queue remain for safe retries):
-- select cron.alter_job(jobid, active := false) from cron.job where jobname='station-live-chat-cleanup';
-- update public.chat_cleanup_settings set enabled=false where singleton;

-- Monitor (no message content or attachment paths):
-- select state,count(*) from public.chat_cleanup_objects group by state;
-- select count(*) as unparsed_snapshots from public.chat_cleanup_queue;
-- select error_code,count(*) from public.chat_cleanup_objects where error_code is not null group by error_code;
