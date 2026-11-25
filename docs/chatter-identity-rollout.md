# Chatter realtime and guest identity rollout

This change adds anonymous Supabase Auth identities, server-assigned Chatter
handles, owner-only display-name updates, message idempotency, and per-account
message throttling. It does not apply database migrations or change the live
project.

## Test and migration order

1. Back up the target database schema and verify the live `chat_messages`
   columns, grants, RLS policies, publication membership, and retention job.
2. Apply all earlier repository migrations through
   `20261123000000_chat_realtime_publication.sql` to a disposable Supabase
   project first.
3. Apply `20261125000000_chatter_anonymous_identity.sql` to that project.
   Existing messages remain unchanged and have null identity fields; their old
   author labels are rendered as legacy labels rather than assigned new handles.
4. Enable anonymous sign-ins in the Supabase Dashboard under **Authentication
   → Sign In / Providers → Anonymous Sign-Ins**.
5. In **Database → Publications → `supabase_realtime`**, verify
   `public.chat_messages` is included. The repository already has an idempotent
   publication migration; do not add the table twice.
6. In **Database → Tables → `chat_messages` → Policies**, verify clients can
   select messages but cannot insert, update, or delete them directly. New
   sends must use `send_chat_message`; its database function derives the author
   from `auth.uid()`.
7. Configure CAPTCHA before enabling Supabase CAPTCHA protection:
   - Create a free Cloudflare Turnstile widget for the deployed website and local
     development hosts.
   - In **Authentication → Bot and Abuse Protection → CAPTCHA Protection**,
     select Turnstile and enter its **Secret Key**.
   - Set `VITE_TURNSTILE_SITE_KEY` to the public site key in the GitHub Pages
     build environment. Never put the secret key in a `VITE_` variable or the
     repository.
   - Do not enable Supabase CAPTCHA until both sides are configured; otherwise
     new anonymous sessions will be rejected.
   - For local development, copy `.env.example` to `.env.local`, set the public
     `VITE_TURNSTILE_SITE_KEY`, and restart Vite. `.env.local` is gitignored.
8. Build and deploy the frontend only after the migration and settings are
   approved and verified in the test project. The frontend and migration must
   roll out together because direct message inserts are intentionally revoked.

Supabase anonymous users use the `authenticated` database role. The default
Supabase Auth anonymous-sign-in limit is IP-based; the message RPC additionally
limits each identity to 10 messages per minute. CAPTCHA is strongly recommended
to discourage account farming. These controls are not a guarantee against
distributed abuse.

Existing visitor-ID reactions are retained as historical counts but are no
longer owner-editable: those browser UUIDs cannot safely be mapped to Auth
accounts. New reaction writes use the authenticated user ID and the database
checks ownership.

## Rollback and lifecycle

The migration preserves old messages and adds nullable attribution fields; it
does not rewrite historical authors. Do not drop the new columns, profile rows,
or idempotency index during rollback. New messages reference the Auth UUID and
keep a public handle snapshot; deleting an Auth user nulls the message's
`author_id` while retaining the historical handle.

Because the migration revokes direct inserts, an older frontend that inserts
directly into `chat_messages` is not a compatible rollback. If a release must
be stopped, pause Chatter posting or roll forward a compatible frontend; keep
the migration and data in place. Do not restore the former public insert policy.

Supabase anonymous users persist until deleted. Clearing browser storage or
using another device creates a different guest; it does not recover the old
account. The existing 24-hour message/media retention does not delete Auth
users. Monitor anonymous-user counts and database usage, and approve a separate
retention policy before scheduling account deletion.

## Verification

Use two phones or isolated browser sessions on the same line: send both ways,
switch channels, background/foreground one client, and reconnect it after a
network interruption. Confirm delivery without reload, stable handles after
refresh, fixed handles after name edits, duplicate names distinguished by
handle, and a single row after retrying a send. Inspect browser WebSocket errors
and Supabase Auth/database usage. Do not test against production without an
approved test window.
