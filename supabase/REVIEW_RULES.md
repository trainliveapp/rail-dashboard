Station review rules
===================

- Everyone may read current reviews and scores.
- Guests can submit without signing in, verifying an email, or creating an auth account. Signed-in users can also submit without email verification.
- One current review per guest browser or signed-in account per station. Later saves replace it; the review count does not increase. Users can review other stations independently.
- Editing is allowed without a waiting period. The form loads the existing stars and description. Clearing a category removes that rating.
- A review needs at least one whole-number rating from 1 to 5, or nonblank text. Descriptions are limited to 500 characters.
- Users cannot supply an author ID, edit another account's review, set their own aggregate score, or write directly to the ratings table.
- Simultaneous submissions use a database unique index and atomic upsert. Button locking also prevents accidental repeated clicks.

Deployment
----------

Run the complete `migrations/20261023000001_guest_station_reviews.sql` in the Supabase SQL editor. It includes its prerequisites and works on the existing base reviews schema, whether or not `20261023000000_strict_station_reviews.sql` was applied. It can also be rerun safely. With an automated migration runner, apply pending migrations in timestamp order so the guest migration runs last. Until this migration is applied, the frontend deliberately refuses to fall back to unrestricted inserts.

The migrations preserve old records: duplicate signed-in reviews are marked as superseded, retaining the most recently created one in public lists and averages. Existing guest reviews remain visible as legacy feedback. Reviews submitted before browser ownership tracking cannot be linked back to a guest for editing. No records are deleted.

Saving uses the `save_station_review` RPC. It validates the payload and derives account identity from `auth.uid()` when signed in. For guests, a random UUID token is stored in browser local storage. Only its SHA-256 hash is stored in a separate private database table, linking the guest to their review. Guest ownership is not exposed in public review rows. `get_my_station_review` returns a review only for the current account or the supplied guest token. Public table access remains read-only.

Guest edits and initial creation are serialized per token and station using a database transaction lock; signed-in duplicates are prevented by the unique index. Signing in uses the account's review independently of the browser's guest review.

Verification
------------

Run `node --test tests/reviewRules.test.js tests/reportInteractions.test.js` for client validation and interaction tests.

For isolated PostgreSQL integration tests, install `@electric-sql/pglite` in a temporary directory, set `REVIEW_TEST_PGLITE_MODULE` to its `dist/index.js`, and run `node --test tests/stationReviewDatabase.test.js`. This suite creates an in-memory database with test auth roles and users. It checks the original strict migration, then the guest upgrade: account-free submissions, private ownership, missing-token rejection, unverified-account acceptance, direct-write denial, invalid payloads, duplicate prevention, editing without extra votes, score calculation, and preservation of legacy duplicates. It also verifies that guest submissions create no auth users.

These rules identify accounts or browser tokens, not physical visitors. Clearing browser storage, switching browsers, or using a new token creates a new guest identity. If persistent storage is blocked, guest identity lasts only for the current page session. These rules do not prove a station visit or prevent deliberate creation of multiple guest identities or accounts.
