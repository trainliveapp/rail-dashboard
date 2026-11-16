# Chatter: online Supabase setup

Use the Supabase website for these steps. Nothing has been applied to your hosted
project by this change. No new provider is required.

## 1. Inspect the live project

Open your project > SQL Editor > New query. Paste and run
`supabase/chat-cleanup-audit.sql`. Review all result tabs privately.
Confirm `chat_messages.id` is UUID, `created_at` is timestamptz, and `image_url` /
`video_url` are text. Confirm the two buckets really are `chat-images` and
`chat-videos`. Check custom triggers and cascades cannot change reporting data.
Check other schemas, external applications, backups and exports for references;
the worker protects public application tables, not unknown external references.

Check Dashboard > Usage / Billing for database size, Storage, egress, Cron and Edge
Function headroom. Every-15-minute scheduling means about 2,880 invocations in a
30-day month, plus manual tests/retries. Actual cost is not verified here. Record
plan, remaining allowances, backup/log retention and any existing overlapping jobs.

## 2. Install the SQL (disabled by default)

After the schema matches, paste all of
`supabase/migrations/20261116000000_chatter_retention.sql` into SQL Editor and run it.
It creates protected settings, durable retry queues, RPC functions, trusted client
timestamps and reference guards. It does not delete messages or create a job.
It does not migrate old guest identities or infer authorship from display names.

The guard serializes public-table writes briefly against cleanup claims and scans
public rows conservatively for candidate object paths, including JSON/encoded URLs.
Benchmark this on staging at your actual data volume. Reinstall the guard block
when adding public tables; media claims fail closed if a table lacks its guard.
Non-ASCII/legacy/signed/external attachment URLs remain queued for manual review.
Do not reuse retired object names or overwrite approved bucket objects. New uploads
must use unique names. Confirm both buckets are exclusively for chat media before
setting `media_ownership_confirmed=true`.

Run this private dry run in SQL Editor:

```sql
select public.chat_cleanup_batch(true);
```

It returns up to 100 exact candidate IDs, UTC timestamps and attachment URLs. No
messages or files are removed. Review the full audit for candidates beyond the batch.

## 3. Create the online Edge Function

Dashboard > Edge Functions > Deploy a new function > Via Editor. Name it
`chat-cleanup`. Replace the editor contents with the complete generated file
`supabase/dashboard/chat-cleanup.ts` and deploy it. This single file has no local
imports. To regenerate it after source edits: `node scripts/package-chat-cleanup.mjs`.

In the function settings disable **Verify JWT** for this function only. It uses its
own required `x-cleanup-secret` header, with no browser/CORS access.
In Edge Functions > Secrets create `CHAT_CLEANUP_SECRET` with a long random value
(at least 32 random bytes). Supabase supplies `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` on the server. Never add this secret or service-role key
to Vite variables, frontend code or Git.

Use the function's Test panel: POST, header `x-cleanup-secret` containing that value,
header `Content-Type: application/json`, body `{"dry_run":true}`. The response should
match SQL's preview. Keep candidate responses private; logs contain aggregate counts
or sanitized error codes only.

## 4. Test on an isolated staging project

Repeat the installation there and create synthetic records/attachments with the
actual channel and required fields. Insert timestamps as an administrator so the
client timestamp trigger does not replace them. Use ages 23h59m and 24h01m.
Verify preview includes only the older message. Insert a report referencing the
same attachment and verify it survives cleanup with its file.

On **staging only**, enable cleanup and confirm dedicated chat-bucket ownership:

```sql
update public.chat_cleanup_settings
set enabled=true, media_ownership_confirmed=true where singleton;
```

Invoke the function with `{"dry_run":false}`. Verify the older chat row disappears,
the younger row remains, unused chat media disappears through Storage API, and report
rows/statistics remain unchanged. Re-run to verify idempotency. Simulate Storage
failure/interruption, then retry: deleting claims and snapshots must persist. Try
adding a new reference during a claimed deletion; it must be rejected. Shared media
must be deferred until its final reference disappears. Test simultaneous invocations;
one should report `worker_busy`. A crashed worker lock expires after 15 minutes;
individual deleting claims remain protected for safe retries.

## 5. Install the schedule and activate after review

Enable Supabase Cron (`pg_cron`), `pg_net` and Vault using the Dashboard if not enabled.
Create these Vault secrets using the Dashboard:

| Name | Value |
| --- | --- |
| `chat_cleanup_url` | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-cleanup` |
| `chat_cleanup_secret` | Same value as `CHAT_CLEANUP_SECRET` |

Run `supabase/chat-cleanup-schedule.sql`. It creates an **inactive** 15-minute job.
Only after the production preview, staging results and costs are reviewed and
approved, run its two commented activation statements separately.

To pause, deactivate the Cron job and set `enabled=false`, using the included pause
queries. An in-flight Storage request can still finish. Keep queues/tombstones so
retries remain safe. Monitor queue errors and Cron/Edge logs; a successful pg_net
enqueue alone does not mean the HTTP function succeeded. Queued unknown URLs require
manual correction, not deletion of their references.

## Verification in this workspace

Automated worker tests cover parsing, dry runs, overlap, durable retry references,
shared-object deferral, Storage failures and missing objects. Production Supabase
schema, usage/cost and actual Storage API behavior still require the online steps.
The JavaScript suite passed 70 tests with 5 environment-dependent tests skipped.
The separate `tests/chatCleanupDatabase.sql` passed on isolated PostgreSQL 17,
including boundary timestamps, report references, permissions and overlap checks.
Chrome mobile emulation passed opening at latest, green own bubbles, fixed header,
jump-to-latest, and restored page scrolling. Screenshots are in `tmp/`.
Phone keyboard behavior and Android/iPhone recordings require device validation.
Own-message colour currently follows IDs saved in this browser; another browser or
cleared storage cannot identify historical ownership.
