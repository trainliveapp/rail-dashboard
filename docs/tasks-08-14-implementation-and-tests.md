# Tasks 08–14: implementation and verification

Date: 10 November 2026 (Asia/Karachi).

Source: the supplied `Station_Live_14_Issues_Exact_Approved_Flavio_Final.docx.pdf`, pages 12–22. Tasks 01–07 were treated as existing work; task 14 also regression-checks those flows. PDF annotations and instructions were used only for the requested tasks. No screenshot produced by QA is labelled as founder-approved.

## 08 — Flavio Coming Soon

Implemented the white responsive panel, blue Coming Soon badge, gold stars and four unboxed features: Journeys (blue), Station Updates (amber), Greener Travel (green), Discoveries (purple). The character uses the approved reproduction embedded on PDF page 13, extracted without generating replacement artwork. The standalone original 2962.png was not available. An SVG viewport isolates the existing character from the source's static labels; the source JPEG itself is unchanged. Heading, features, countdown and CTA are actual HTML, rather than a screenshot UI.

Verified with headless Chromium/Edge at phone, tablet and desktop widths. Checked four features, full character viewport, panel scrolling, lack of horizontal overflow, Escape and focus return. Visual review caught and corrected a fragment of static source text in the initial character viewport, plus a conflicting old CSS class. Evidence: `tmp/qa/task08-flavio-390.png` and `tmp/qa/task14-flavio-*.png`.

Status: implemented and locally tested. Founder sign-off of the final responsive composition is not implied.

## 09 — Global calendar countdown

The target comes from the server's `FLAVIO_LAUNCH_AT`, through `flavio-config`. It is shared by all visitors and never based on when a visitor opens the panel. The calculation clamps end-of-month dates, handles leap years, displays months/days/hours/minutes, refreshes each minute and on visibility/pageshow, and clamps to zero. An unset or invalid timestamp displays “Launch date to be announced”.

Four unit tests cover month ends, leap years, exact six calendar months, partial months, UTC precision, zero/expired targets and invalid configuration. Browser tests use a clearly marked fixture, verify six months, move the clock to launch, dispatch a returning-tab event and verify all zeroes.

Status: implemented/tested; **real launch timestamp still required**. The PDF's example date and test fixture are not production configuration.

## 10 — Launch notification

Added the white modal with blue bell, exact heading, description, labelled email field, consent checkbox, Notify me button, privacy explanation and “Launch notification only. No spam.” The native dialog provides focus trapping, Escape, close X and focus return. Nested cancellation is isolated so closing the notification does not also close Flavio.

`flavio-notify` performs server validation, checks consent, enforces CORS, caps body size, hashes the IP with a server secret, rate-limits and saves a deduplicated opt-in. No account/password is requested. Success appears only after a positive server acknowledgement. Database roles cannot read private subscriber data or invoke the privileged writer directly.

Six request/client tests cover normalization, consent, malformed/oversized bodies, origin/method checks, rate limiting and false-success prevention. Browser tests cover invalid email blocking, keyboard focus trapping, nested Escape/focus return, simulated save failure, retry and success. Isolated PostgreSQL tests execute the real migration, validate deduplication/consent provenance, permissions and rate-limit behaviour, including concurrent submissions.

Status: locally implemented/tested; hosted function and migration deployment still required. No real subscriber was added during testing.

## 11 — Unboxed footer features

Preserved the original six footer labels shown in the existing site, rather than deleting content to force the document's general “four feature areas” wording. Icons remain standalone. Removed desktop separators and the decorative footer-note underline; kept readable labels and touch spacing.

Browser computed-style assertions verify transparent icon/row backgrounds and zero borders. The viewport matrix checks the footer/page for horizontal overflow. Evidence: `tmp/qa/task11-footer-390.png`.

Status: implemented/tested. The supplied footer concept is amber; it is not treated as a signed-off final image.

## 12 — Slim advertising banner

Replaced the tall advertisement teaser with a compact white button: “Reach travellers”, “Advertise with StationLive”, and a small arrow. The entire surface opens the enquiry, with keyboard, hover and focus states. No loudspeaker or yellow underline was added.

Browser assertions verify white background, compact height, no overflow and working keyboard activation. Evidence: `tmp/qa/task12-banner-390.png`.

Status: implemented/tested; amber artwork approval is not claimed.

## 13 — Advertising enquiry and delivery

The banner opens a branded form using the existing `src/assets/logo.png` asset. Fields are business email, company, message and permission to respond. There is no hardcoded mock-up email: the user explicitly confirmed **stationlive@gmail.com**, now the server-side default recipient. Sender and provider credentials remain server settings.

`advertising-enquiry` validates the form, rate-limits it, saves a deduplicated enquiry, sends plain text using Resend and records the provider receipt. Missing configuration, a failed provider response, a missing receipt or a failed database acknowledgement cannot produce success. Already-sent duplicates do not resend; retries use the stable enquiry ID.

Five delivery tests cover validation, absent configuration, acknowledged delivery, duplicates/rate limits and failure paths. Browser tests cover keyboard activation, logo, field entry, consent, simulated failure/retry, success and focus return. PostgreSQL checks validate stable IDs and saved sent-state across retries.

Status: implemented/tested locally. **Production deployment, a verified sender/provider key, and authorized live recipient/inbox testing remain pending.** No real email was sent.

## 14 — Viewport, interaction and data QA

Tested the production build in headless Chromium/Edge with external requests blocked:

| Viewport | Mode | Result |
| --- | --- | --- |
| 320 × 568 | Touch emulation | Pass |
| 360 × 640 | Touch emulation | Pass |
| 375 × 667 | Touch emulation | Pass |
| 390 × 844 | Touch emulation | Pass |
| 430 × 932 | Touch emulation | Pass |
| 768 × 1024 | Tablet-size desktop engine | Pass |
| 1440 × 900 | Desktop | Pass |

Checks include Flavio/form bounds, independent panel scrolling, touch-sized report options, page overflow, Chatter's unselected first open, National Rail first, opaque picker, no radio controls, scoped case-insensitive operator search, Back, selected stable ID and refresh persistence. The 390px scenario reduces visible height to model keyboard space. Desktop wheel checks verify page scrolling over the map. Existing gesture tests exercise one-finger scrolling and the installed two-finger plugin; these are not claims of physical-device verification.

Database execution verifies each active London channel's explicit report-line ID and that National Rail operator IDs do not inherit an unrelated Underground line. Existing station-directory tests validate stable identities/search over the downloaded dataset. This does not independently certify the live accuracy of all station/operator associations.

Repaired the incomplete tail of the unused `MapPanel.jsx` so whole-project lint runs; the active dashboard still imports `MapPanel.leaflet.backup.jsx`. Added `viewport-fit=cover`, visible-viewport form sizing and sticky close buttons.

Final automated results:

- `npm run build`: pass (existing large-bundle warning).
- `npm run lint`: pass with existing warnings; no syntax errors.
- Full regression suite including isolated PostgreSQL: **64 passed, 0 failed, 4 skipped** (68 reported tests including nested SQL checks).
- Four skipped checks are older PGlite-dependent report/review database integrations; their optional runtime was not supplied. New forms and active channel mapping SQL were executed in PostgreSQL 18.
- Browser task checks 08–13 and all seven viewport scenarios: pass. Form responses and email delivery are mocked in browser tests.
- `git diff --check`: pass.

Release is not signed off: real iOS/Android gesture/keyboard/safe-area testing, physical touchpad checks, hosted backend deployment, live email verification, confirmed launch time and founder approval of amber references remain outstanding. See [deployment instructions](public-forms-deployment.md).
