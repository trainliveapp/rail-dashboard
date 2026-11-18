# Chatter guest names and stored-message search: pre-implementation audit

Audited 18 November 2026. Branch: `feature/chatter-guest-names-search`.

Status: repository audit complete; live database audit blocked. No application
code or production database has been changed for this feature. The public schema
request using the workspace's frontend credentials returned HTTP 401. No working
administrative database connection is available. A Supabase plugin exists but is
not yet installed/connected. Live schema, policies and project-specific quotas
must be confirmed before implementation, as required by the brief.

## Findings from the repository, not a verified production snapshot

- `src/lib/chatIdentity.js` already creates a UUID with `crypto.randomUUID()` and
  stores it under `rail-dashboard-chat-visitor-id`. Reuse this identity. Validate
  stored UUIDs; retain safe existing UUIDs. Storage failures need a stable
  in-memory fallback, not a different identity on every call.
- `src/components/MapChat.jsx` is the active Chatter UI. The beginning contains
  commented-out historic implementations; edits must target the active component.
  New guest posts currently use `Station Live Guest`. React safely renders names
  and messages as text. Existing own-message IDs only control presentation;
  they must not acquire edit/delete authority.
- `public.chat_messages` is defined with `id`, `username`, `message`, `line`,
  `image_url`, `video_url`, `created_at`, and later `channel_id`. There is no guest
  visitor column in the checked-in message migrations. `username` can already
  preserve the display-name snapshot without renaming historic messages.
- `public.chat_message_reactions` has `id`, `message_id`, `user_id`, `visitor_id`,
  `reaction`, `created_at`. Existing guest UPDATE/DELETE policies accept any
  non-null guest visitor ID. This is not verified ownership and appears to allow
  anonymous requests to alter other guests' reactions. Confirm the live policies
  and address the authorization issue without treating a public UUID as proof.
- Channels use `src/data/chatChannels.js` and `src/lib/chatSelection.js` with stable
  `channel_id` values. Search must not fall back to display-name/legacy `line`
  matching, especially for similarly named National Rail/Underground channels.
- Normal loading reads the newest end of the chosen channel, ordered by timestamp
  and ID, within a 24-hour visibility window. Supabase's row cap can exclude older
  retained messages. Search needs independent database queries and bounded context
  loading; appending a result to the latest list alone is insufficient.
- Realtime refresh currently replaces the loaded message array. Search navigation
  must preserve the context view against refreshes, stale requests, late attachment
  sizing, auto-follow-to-latest, channel switching, expiry and deletion.
- The retention migration installs cleanup infrastructure disabled by default.
  The frontend's 24-hour visibility rule is separate from whether physical cleanup
  is enabled. The checked-in SELECT policy is unrestricted. Live cleanup and any
  moderation/deletion columns or policies must be inspected; none can be invented.
- Existing uploads permit files up to 50 MB. This can consume a substantial part
  of the Free storage/egress budget; this feature must not add larger allowances.

Relevant schema migration files were copied to `tmp/chatter-audit/` before changes.
These are source backups only, not a production schema backup.

## File-by-file implementation plan

1. `supabase/chatter-guest-search-audit.sql` (provided): read-only catalog queries
   for the actual columns, RLS, grants, indexes, constraints, triggers and functions.
   Review the results and take a full schema-only backup using existing approved
   Supabase/database access. Confirm current plan/usage and retention deployment.
2. `supabase/migrations/20261118000000_chatter_guest_names_search.sql` (proposed;
   not created until live audit): reuse `chat_messages.username`, add a nullable
   `visitor_id uuid` only if production lacks a safe attribution field. Do not
   backfill identities or rewrite any old message. Enforce nickname/message bounds
   on trusted INSERT paths without applying new nickname restrictions to old rows.
   Validate trimmed 3–24-character nicknames, reserved/impersonating names and a
   documented inappropriate-name filter; apply equivalent client rules. Add bounded
   server-side anti-spam checks. Guest-ID throttles are bypassable and must not be
   described as authenticated rate limiting. Final policies depend on the live audit.
3. Same migration: provide parameterized, read-policy-preserving search and context
   queries scoped to `channel_id` and the existing retention/moderation conditions.
   Prefer built-in PostgreSQL full-text indexing over adding an extension, subject
   to live index/storage review. Cap query length, results and context; set a bounded
   query timeout. No dynamic SQL or HTML snippets. No new message edit/delete grants.
4. `src/lib/chatIdentity.js`: generate a readable `Traveller ###` default using
   cryptographic randomness, persist nickname separately from the existing UUID,
   trim/validate edits and handle unavailable/cleared storage. Duplicate names are
   valid display labels. Nickname edits affect future posts only.
5. `src/lib/chatMessages.js` (new): client message bounds, guest attribution and
   posting data flow using the existing Supabase client. Keep attachments, channel
   associations and signed-in participation working. No service-role credentials.
6. `src/lib/chatSearch.js` (new): minimum two characters, query cap, safe database
   parameters, 300ms debounce integration, at most 30 results, and fetching a target
   plus nearby retained context. Recheck target visibility when selected. Define
   deterministic timestamp/ID ordering. Handle missing/deleted/expired targets.
7. `src/components/ChatterSearch.jsx` and `src/components/ChatterNicknameMenu.jsx`
   (new): compact input/results and optional nickname editor, with keyboard labels,
   clear/close controls, loading/empty/error states, line context, snippets and date/
   time. Explain that names are unverified and browser-data clearing/device changes
   can create a new identity. Never require a naming screen before posting.
8. `src/components/MapChat.jsx`: mount the search icon immediately before the
   existing X; mount the compact search below the line selector. Add a subtle
   identity-menu entry point. Use saved nickname for new posts; preserve existing
   display names. Load/scroll/highlight older results and suspend auto-follow while
   viewing context. Keep artwork, header dimensions, channel controls, counts,
   reactions, attachment controls, composer and footer intact.
9. `tests/chatIdentity.test.js`, `tests/chatSearch.test.js`,
   `tests/chatGuestSearchDatabase.test.js` (new): persistence/reload/storage reset,
   UUID reuse/invalid storage, nickname validation/duplicates, trusted backend bounds,
   RLS/authorization, spam checks, line isolation, literal special input, empty/error
   states, retention/deletion, older context navigation and channel/request races.
   Exercise SQL against a throwaway local PostgreSQL database, never production.
10. `scripts/qa-chatter-guest-search.mjs` (new) and deployment notes: capture before/
    after at 320/360/390px with browser mobile emulation, slow responses, reloads,
    cleared storage and old results outside the initial page. Document that desktop
    Chrome mobile emulation is not a physical Android Chrome test. Run build, lint
    and meaningful existing/new tests. Preserve screenshot/video evidence.

## Deployment and rollback

Do not push/deploy, apply production SQL, change project settings, or merge to main
without founder approval. The current GitHub Pages workflow deploys main only; no
automatic feature-branch preview is configured. Use local preview unless a verified
no-cost preview already exists.

Before deployment, review a schema-only backup and live policy definitions, test
the migration/rollback on a disposable database and document frontend/database
version compatibility. Deploy additive schema before dependent UI. Roll back the
frontend to the preceding approved release first. Remove only new feature RPCs,
indexes/triggers/policies after review; preserve new attribution columns and posted
messages. Restore policy definitions from the verified backup only if safe—do not
blindly restore the known-permissive guest reaction policy. Do not delete messages,
reactions, attachments or cleanup data as part of rollback.

## Free-tier checks and remaining decisions

The public Supabase Free pricing currently lists 500 MB database size and 1 GB file
storage. Bandwidth documentation lists separate 5 GB cached and 5 GB uncached
allowances. These are published allowances, not confirmation of this project's
actual plan or remaining quota. Full-text indexes consume database space; search
and realtime consume query capacity/egress; attachments can dominate bandwidth.
Check Dashboard usage before deployment and monitor query latency and index size.
No promise of unlimited free usage is made.

Sources checked 18 November 2026:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/storage/serving/bandwidth
- https://supabase.com/docs/guides/auth/auth-anonymous

Missing: live schema/RLS/grants/trigger export or working connected Supabase access;
actual project plan/usage; active cleanup/moderation state. The confirmed reaction
ownership design must preserve functionality safely; built-in anonymous Supabase
Auth is a possible no-registration option only after checking existing project
configuration and quotas. It must not silently introduce a parallel visitor-ID
system or change account flows. Strong abuse resistance cannot be promised from
forgeable local UUIDs alone. Any requirement for additional paid infrastructure
requires a separate, explicit approval.
