# Flavio and advertising deployment

The frontend and Supabase Edge Functions are implemented, but this change does not deploy them or configure production secrets. No real email was sent during QA.

## Confirmed and pending settings

- `ADVERTISING_TO_EMAIL`: required server-only founder-confirmed advertising destination. There is no hardcoded fallback; the addresses shown in visual mock-ups are not configuration. Earlier notes recorded **stationlive@gmail.com**; confirm the intended destination before configuring production delivery.
- Flavio launch date/time: **not supplied**. Do not use the date in the PDF example or the browser test fixture as a real launch date.
- `FLAVIO_LAUNCH_AT`: one confirmed ISO UTC timestamp, including seconds and `Z`. Unset/invalid configuration returns HTTP 503 and the UI says “Launch date to be announced”.
- `PUBLIC_FORM_ORIGINS`: comma-separated exact production origins, for example the actual HTTPS StationLive host(s). No wildcard.
- `FORM_RATE_LIMIT_SECRET`: a server-only random secret of at least 32 characters for keyed IP hashes.
- `RESEND_API_KEY`: server-only sending API key.
- `FORMS_FROM_EMAIL`: a plain email address on a verified sending domain. It is separate from the recipient. Do not use a Gmail sender with an unverified sending domain.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: hosted Edge Function environment only. Never add the service-role key to Vite variables.

## Deployment sequence

### Diagnosed 11 November 2026

Read-only OPTIONS probes against the project configured in `.env.local` returned HTTP 404 with `NOT_FOUND` / `Requested function was not found` for both `flavio-notify` and `flavio-config`. No email was submitted. The notification failure requires backend deployment; changing email validation or showing local success cannot fix a missing endpoint.

From an authenticated Supabase CLI, deploy to the intended project after applying the migration and setting `PUBLIC_FORM_ORIGINS` and `FORM_RATE_LIMIT_SECRET`:

```powershell
supabase functions deploy flavio-notify --project-ref <project-ref>
supabase functions deploy flavio-config --project-ref <project-ref>
```

Use the exact browser origin in `PUBLIC_FORM_ORIGINS` (including scheme and local port when testing). The notification function does not require Resend or an email sender: it saves the launch opt-in in the database. Confirm the launch timestamp before setting `FLAVIO_LAUNCH_AT`; the example date is not approval. Re-test a real consented submission after deployment, including duplicate and failure behavior.

Artwork compliance remains pending: the checked-in `flavio-approved-2962.jpg` is documented as an extraction from the supplied PDF, not the original user-supplied `2962.png`. Obtain that exact original before claiming exact-file approval.

1. Apply `supabase/migrations/20261111000000_public_enquiry_forms.sql` to the intended project, after reviewing the migration in staging. Existing channel migrations, including the Hammersmith mapping correction, must already be applied.
2. Configure the server settings above. Keep the launch timestamp unset until it is confirmed.
3. Deploy `flavio-config`, `flavio-notify`, and `advertising-enquiry` using the Supabase CLI from the repository root. These functions import their checked-in shared modules and validators.
4. Retain the platform JWT verification expected by the existing Supabase client; guests use the public anon key and do not need an account. Ensure browser preflight requests are accepted by the gateway.
5. Confirm CORS allows only the real website origins and that the gateway supplies the trusted client-IP header. Rate limits are 5 attempts per form per IP hash per UTC hour.
6. In staging, submit one consented notification and check that repeating it creates only one row. Verify failures and the sixth attempt never display success.
7. After explicit authorization to send a real test enquiry, verify provider acceptance and receipt at the founder-confirmed `ADVERTISING_TO_EMAIL`. Browser QA uses mocks and cannot prove inbox delivery.
8. Confirm the real launch timestamp before publishing an active countdown. The code never creates a per-visitor six-month target.

## Data handling

Notification records store the normalized email, consent version and consent time. Advertising records store business email, company, message, consent provenance and the provider receipt. Browser roles cannot select these tables or call their privileged writers. The backend rejects invalid data and consent, caps request bodies at 20 KB, uses a keyed IP hash instead of retaining raw IP addresses, and sends plain-text enquiry email.

A notification registration returns success only after the database acknowledges it. Advertising returns success only after the provider supplies a receipt and the database records it, or after an already-sent duplicate is recognized. Provider acceptance is not proof of inbox delivery. Retries reuse the enquiry ID as the provider idempotency key; the database retains sent state to avoid resending completed enquiries. See [Resend idempotency documentation](https://resend.com/blog/engineering-idempotency-keys).

Configure retention and deletion jobs before collecting production data: remove expired rate-limit buckets, remove notification addresses after the launch notification workflow, and delete enquiries when they are no longer needed. Do not repurpose these addresses for marketing. The code adds no automatic launch-email campaign; it registers the requested opt-in only.

## Reproduce tests

- Unit/regression checks: `node --test tests/*.test.js`.
- Build: `npm run build`.
- Browser QA: set `PLAYWRIGHT_MODULE_PATH` to an installed Playwright module if it is not on Node's module path; set `QA_BROWSER_PATH` to a local Chromium/Edge executable if needed; run `node scripts/qa-tasks-08-14.cjs`. Tests serve `dist` through isolated Playwright routing at a simulated HTTPS origin and block external requests. Add `--through=10`, for example, to stop after that task.
- PostgreSQL QA on Windows: set `PG_BIN` to an installed PostgreSQL bin directory, then run `node scripts/qa-forms-db.cjs --all`. It creates a temporary cluster under `tmp`, listens only on 127.0.0.1:15439, creates/drops a uniquely named test database, and stops its cluster afterwards. It never connects to the production project. `QA_PG_DATA` can select another temporary cluster directory.
- The older PGlite-dependent report/review database tests require `REVIEW_TEST_PGLITE_MODULE`; they remain skipped when that optional dependency is absent.
