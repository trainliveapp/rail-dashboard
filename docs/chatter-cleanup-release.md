# Chatter cleanup release gate

Production deletion is not implemented or scheduled yet. The supplied brief explicitly
requires live schema inspection, a dry run, cost confirmation, and founder approval.
No Supabase management connector or Supabase CLI is available in this session.

Repository evidence: chat_messages uses created_at (timestamptz), image_url and
video_url. The client uploads to chat-images and chat-videos. Reactions cascade on
message deletion. Messages have no persisted author identity; username is a generic
guest/user label and cannot safely identify historical ownership. New outgoing
message IDs are stored in this browser to colour its messages green on the right.
Clearing browser storage or using another device loses this presentation-only
association; it does not grant permissions or identify historical authors.

## Required live inspection

Run supabase/chat-cleanup-audit.sql privately in the intended project. Inspect all
attachment-bearing fields, including JSON fields and other tables, for references to
these buckets. Confirm RLS, timestamp trust (clients must not be able to choose an
arbitrary created_at), existing schedules and functions. Check the Supabase billing
dashboard for plan, database/storage headroom, invocation allowance and egress.
Record actual figures and retention for backups, logs and exported copies.

## Backend implementation after inspection

Use a bounded batch every 15 minutes, authenticated with a server-only secret.
Default to dry-run and require a separate explicit activation setting. Compute the
cutoff in PostgreSQL using now() - interval '24 hours'. Store a durable cleanup queue
with message IDs and normalized bucket/object paths before removing message rows.
Resolve ownership and check references across retained messages and report tables;
never infer sole ownership merely because a URL appears in an expired message.
Prevent new references while an object is being deleted, using an enforced database
claim/reference protocol. Recheck references before each deletion. Shared objects
must remain and can be reconsidered only when their final reference expires.

Delete eligible objects through the Storage API, never storage.objects SQL deletes.
Keep failed queue items with retry information; missing objects count as already
removed. Delete only expired chat_messages once attachments are removed or durably
queued. Never delete station_updates, reports, report_lines or reporting statistics.
Serialize overlapping workers and make retries idempotent. Log aggregate counts
and sanitized error codes only, without URLs, message content or identities.

## Validation and approval

Test in an isolated project with synthetic messages at 23h59m and 24h01m, messages
without media, shared media, repeated runs, concurrent reference creation, failed
Storage deletions and interrupted workers. Verify retained report references and
rows survive, and retry references survive all failure paths. Present exact dry-run
candidate IDs and object paths privately, aggregate counts, and actual cost headroom
to the founder. Obtain approval before enabling deletion or installing a schedule.

## Frontend verification still needed

On a real phone, verify opening and switching channels land at the bottom, scrolling
history shows the 44px arrow, incoming messages do not move the reader, tapping the
arrow jumps down, image/video loading keeps the view stable, and the keyboard keeps
the composer visible. Close Chatter and confirm normal page/map gestures return.
The second attachment includes section 04's exact text rules, now implemented:
green/right outgoing bubbles, off-white/left incoming bubbles, dark 16px body text,
85% maximum width, visible incoming sender names, Like/Reply and a Save/Share menu.
No embedded sketch image was included in the text attachment. Visual matching and
Android/iPhone screen recordings are not yet verified or delivered.
