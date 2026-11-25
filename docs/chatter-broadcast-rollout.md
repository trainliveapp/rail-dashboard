# Chatter private Broadcast rollout

The client listens to one private `chatter:<channel_id>` Broadcast channel for
the currently open railway room. A database trigger publishes only the inserted
message UUID; the authenticated client then reads the authorised row from
`chat_messages`. Message content and attachment URLs are never Broadcast
payloads. The existing message table, anonymous Auth identities, send RPC,
GitHub Pages hosting, and 24-hour visibility/cleanup policy remain in use.

Realtime may retain Broadcast notification metadata for up to three days. The
payload contains only a message UUID, not chat text or media, but this does not
guarantee that notification metadata follows the table's 24-hour deletion
window. Verify the target project's Broadcast retention behavior before release;
if UUID metadata must also be purged within 24 hours, this migration alone does
not meet that stricter retention requirement.

## Apply and verify

1. Back up the target schema and confirm that `chat_messages` has `id uuid`,
   `channel_id text`, and `created_at timestamptz`. Confirm the existing
   `send_chat_message` RPC, SELECT-only client access to `chat_messages`, and
   24-hour cleanup are active.
2. Compare the room IDs in `src/data/chatChannels.js` with the exact topic
   allowlist in `20261125120000_chatter_private_broadcast.sql`. Add any new
   canonical channel ID to that migration before deploying it. The underscore
   Hammersmith and Waterloo & City IDs are retained for existing database rows.
3. Apply the migration to a disposable Supabase project first, then to the
   approved target project. The migration adds an ordered room/time index, an
   `AFTER INSERT` trigger, and a SELECT-only `realtime.messages` policy for
   authenticated users (including Supabase anonymous users). It does not grant
   clients permission to insert Broadcasts or change project-wide Realtime
   settings.
4. In the SQL Editor, verify there is exactly one enabled
   `chatter_notify_insert` trigger on `public.chat_messages`, the policy is
   present on `realtime.messages`, and no broader permissive policy grants
   unintended access to private topics. Keep existing `chat_messages` RLS and
   Storage policies unchanged.
5. Deploy the matching frontend. Open Chatter in two isolated browser profiles
   or phones, select the same room, and exchange messages. Verify each message
   is delivered once without refresh, room switching tears down the old
   subscription, and foreground/reconnect catch-up restores missed rows.
   Inspect browser WebSocket status and Supabase Realtime/database usage.

If anonymous sign-in or CAPTCHA protection is enabled, retain the existing
configuration described in `chatter-identity-rollout.md`. Never add a
service-role key to the frontend. Monitor shared Realtime connections, events,
database reads, and egress against the existing plan; do not upgrade or change
quotas without approval.

## Rollback

First roll the frontend back to the prior release if necessary. The prior
Postgres Changes path remains available because this migration does not remove
`chat_messages` from `supabase_realtime`. After confirming the rollback, the
Broadcast-only database objects can be removed with:

```sql
begin;
drop trigger if exists chatter_notify_insert on public.chat_messages;
drop function if exists public.chatter_notify_insert();
drop policy if exists "Authenticated passengers can receive Chatter broadcasts"
  on realtime.messages;
drop index if exists public.chat_messages_channel_created_id_idx;
commit;
```

Do not roll back or weaken the guest identity, message-send RPC, message RLS,
or retention migrations as part of this change.

## Acceptance evidence still required before release

Automated repository tests cover room scoping, minimal ID-only delivery,
deduplication, ordering, reconnect reconciliation, and migration contents.
They do not prove delivery between independent devices or verify live project
policies/usage. Record those results, including the two-device exchange,
offline/foreground recovery, failed-send retry, room isolation, and measured
latency, during the approved staging test.
