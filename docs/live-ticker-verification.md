# Yellow LIVE banner verification

Verified against Station_Live_Yellow_Banner_Developer_Instructions.docx.pdf on 18 November 2026, together with the user's later request for slower scrolling.

## Acceptance results

| Requirement | Result | Evidence |
| --- | --- | --- |
| One yellow strip above blue header; fixed red dot, LIVE and divider | Pass | Component inspection and mobile screenshots; original strip structure retained |
| Fixed black two-line Tune icon with circles and no white box | Pass | Browser checks confirm 44 x 44 CSS pixel target, stationary at all tested widths |
| Only report text receives line colour | Pass | Inline text colour; single reliably attributed line only; neutral for multiple/unknown lines |
| Contrast-safe dark variants; textual identification | Pass | Colour darkening targets 4.5:1 against actual yellow; line/station/source names retained |
| All updates default; station-only personalisation, maximum three stations | Pass | Canonical station IDs, validated versioned preference and selection cap |
| Maximum three selections and count | Pass | Browser selection limit; pure validation tests |
| Station search, Apply, Close, Reset and reopen | Pass | Browser interaction checks and component inspection |
| Versioned localStorage, no account | Pass | Reload preserves selected IDs; no authentication dependency |
| Actual station/line relationships, interchanges and deduplication | Pass with data caveat | Existing schema inspected; canonical reports/report_lines preferred; exact station-name fallback for legacy rows; unit tests |
| Neutral empty state | Pass | Browser selects an unrelated station and verifies message |
| Passenger and operator sources distinguished | Pass | Passenger report labels and unverified details; TfL operator details |
| Critical notices bypass filters | No bypass source is implemented | The current source has no trusted network-wide critical flag. Station mode excludes TfL line-wide and unattributed updates because they lack an explicit selected-station relationship; All updates still includes them. |
| Reduced motion; no flashing; scrolling text only | Pass | Browser computed animation disabled with reduced motion; Tune remains fixed; static red dot |
| Slow speed requested after PDF | Pass | Computed animation duration is 224 seconds |
| Narrow layouts, keyboard and focus | Pass | 320/375/768/1440 widths, no page overflow, Enter opens, Escape closes, focus returns to Tune |
| Map theme switching | Pass | Light and dark controls still respond; source unchanged |
| Map, logo, navigation, Chatter and Flavio scope | Source review pass | No changes to their components; browser page remains rendered. External tiles, live geolocation and end-to-end Chatter messaging were not fully tested. |
| No paid services, accounts or schema changes | Pass | Only banner components, CSS, helper, tests and documentation changed |

## Checks

- Production build: passes, with an existing large-bundle warning.
- Test suite: 80 tests, 75 passed, 5 database integration tests skipped because their external configuration is unavailable.
- Repository lint: completes with warnings in existing components. Targeted lint for changed banner JavaScript and tests passes.
- Git whitespace check: passes.
- Browser checks use isolated illustrative fixtures and intercepted local build files. They do not insert mock incidents into the database or prove production database permissions/data completeness.

## Fixes made during audit

- Prevented partial or ambiguous TfL line-name matches from producing a misleading single-line colour.
- Paginated community updates before applying personalisation, removing the previous 1,000-row truncation.
- Added deterministic station-to-line pagination ordering.
- Added a regression test for unknown, partial and ambiguous operator line attribution.

## Files

src/components/TopPromoBar.jsx; src/components/LiveTickerPreferences.jsx; src/lib/liveTicker.js; src/index.css; tests/liveTicker.test.js; docs/live-ticker-personalisation.md; this report.

Screenshots: ../tmp/live-ticker/default-mobile.png, ../tmp/live-ticker/filter-mobile.png, ../tmp/live-ticker/selected-mobile.png.

## Station-only personalisation follow-up

The selector now follows the station-only brief: title “Personalise,” subtitle “Choose up to 3 stations,” fixed search input, independently scrolling results, Clear and Apply (n/3). Preferences use `stationlive-live-preferences-v2`, validate against the current canonical station catalogue, and can migrate valid station IDs from the previous version. Clear and Apply with zero selections restores All updates.

Station mode matches only explicit canonical `station_id` relationships from `reports` joined by the shared `station_updates.id`; older rows may match only by exact catalogue station name. It never broadens a station filter to a line. TfL line notices have no station IDs or trusted critical-network-wide flag in the current table and are excluded in station mode. No database change was made.

The approved storyboard in the open Word document tab was reviewed as the visual reference. A local preview confirmed the panel appears over the current map and exposes its title, subtitle, search, Clear, Apply and Close controls. The ticker loaded reports, but the station catalogue request did not complete in that browser session; the specific remote query error was not captured. Metadata tables now load independently so a line metadata failure does not hide a successful station catalogue. The isolated fixture browser harness points to a removed Playwright runtime path, so no browser interaction run is claimed for this follow-up. Physical mobile keyboards and assistive screen readers were not tested.
