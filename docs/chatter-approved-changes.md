# Approved Chatter changes — acceptance record

Implemented only the three requested changes. No station search, ticker changes, new services or dependencies. Existing Jump to latest code is unchanged. The pre-existing edit to `supabase/chatter-guest-search-audit.sql` was left untouched.

## Code changes

- `src/components/MapChat.jsx`: star toggles inside the existing line/operator selector; favourites grouped at the top above London channels and the National Rail browse button; results use the remaining flex height and scroll independently below the search field.
- `src/lib/chatSelection.js`: persist favourites under `stationlive.chatter.favouriteChannels`, using existing channel IDs. Reject stale IDs, remove duplicates, and tolerate malformed/blocked localStorage.
- `src/index.css`: fit message content to its intrinsic width, cap it at its container, and retain the right edge for own messages. Added a near-opaque white surface and subtle shadow around message content only, with metadata above and reactions below. The photo, action row, header, line bar and composer are preserved.
- `tests/chatSelection.test.js`: persistence, removal, distinct line/operator IDs, invalid data and blocked storage coverage.

## Acceptance checklist

- [x] Favourite/unfavourite London lines and National Rail operators inside the existing selector.
- [x] Favourites survive reload without changing the active channel. Northern Line (`underground_northern`) and Northern (`national_rail_northern`) persist separately.
- [x] Invalid JSON, wrong types, duplicate and retired IDs are handled; blocked storage remains usable for the session.
- [x] Existing search, operator browsing, empty results and Escape dismissal work.
- [x] Search stays above independently scrollable results at 390 × 430. Measured results: client height 213 px, content height 983 px, menu bottom 409 px. Scrolled to the last London channel successfully.
- [x] Short messages size to content (the “Hi” bubble is below 70 px in all three viewport checks); near-opaque white surfaces improve contrast on bright photo regions. Long text and 180-character unbroken strings wrap within their container. Own messages retain right alignment at 390 × 844, 320 × 640 and 844 × 390.
- [x] Mobile before/after screenshots captured from the running local repository at 390 × 844 using actual live messages. Header, line bar, photo, alignment, reaction icons and composer visually preserved.
- [x] Focused automated tests: 14/14 pass (`node --test tests/chatSelection.test.js tests/chatChannels.test.js tests/viewportBounds.test.js`).
- [x] `npm run lint` exits successfully with existing warnings; `npm run build` passes with bundle-size/plugin-timing warnings. `git diff --check` passes.

Keyboard coverage uses Chromium mobile viewport resizing, not a physical iOS/Android keyboard. Existing `visualViewport` listeners are reused. Long-message layout tests used intercepted GET responses in the test browser only; no messages were posted or backend data changed.

## Evidence

Local evidence is in the ignored `tmp/chatter/` directory:

- `before-chat.png`, `after-chat.png`: actual site, live messages, same 390 × 844 viewport.
- `before-selector.png`, `after-selector.png`: selector before/after, including persisted favourites.
- `after-keyboard-sized.png`: results scrolled to the bottom at 390 × 430.
- `after-fixture-layout.png`: local GET-response fixture used for long-text/own-message checks.
- `after.mjs`, `layout.mjs`: browser acceptance checks; `cdp.mjs`: dependency-free Chrome debugging helper.
- `approved-changes.patch`: code/test diff excluding the unrelated SQL edit.

## PDF brief follow-up — 19 November 2026

Reviewed the supplied approved implementation brief against the existing working changes, in task order. Completed two gaps: moved National Rail browsing below the favourites section and added actual content-sized bubble surfaces (the earlier implementation only resized transparent message wrappers).

Re-ran all 14 focused automated tests, lint, production build, and diff whitespace checks successfully. Lint retains existing warnings; build retains bundle-size and plugin-timing warnings. Browser checks ran against the local production preview, with refreshed screenshots. Confirmed bubble backgrounds, short-message sizing, long and unbroken wrapping, and own-message alignment at 390 × 844, 320 × 640, and 844 × 390. Favourites, persistence, reduced-height result scrolling, empty search and Escape passed. No messages were sent or backend data modified. Physical Chrome Android and Safari iOS keyboard behavior still requires device validation; viewport emulation is not a substitute for that test. Attachments and reaction controls remain wired to their existing handlers and were not exercised through backend mutations.
