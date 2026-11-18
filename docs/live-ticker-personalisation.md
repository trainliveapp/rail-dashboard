# LIVE ticker personalisation

Changed files: src/components/TopPromoBar.jsx, src/components/LiveTickerPreferences.jsx, src/lib/liveTicker.js, src/index.css, tests/liveTicker.test.js.

The original yellow strip, red dot, fixed LIVE label and animation remain in place. A fixed two-line Tune icon opens a native modal dialog with keyboard focus containment, Escape, Close, Reset and Apply. Users choose All updates or at most three line/station IDs; station search and versioned localStorage preferences need no account. Reduced motion stops the animation and allows manual horizontal scrolling.

Data comes from existing station_updates, reports/report_lines, stations, lines/colour, station_lines, and tfl_disruptions. Canonical reports share IDs with station_updates. Legacy station names are matched exactly to metadata; ambiguous or unknown associations stay neutral. Interchanges retain all applicable line IDs without duplicating the report. Single-line text uses the stored colour darkened to meet 4.5:1 contrast against the yellow strip. Passenger reports are explicitly unverified; TfL notices are labelled by source.

Safety policy: no trusted network-wide critical flag exists in these sources. All operator notices and unattributed reports bypass personalisation; no critical classification is inferred from passenger prose. This deliberately retains more information than a strict routine-only filter. Official line attribution uses exact normalized names because the existing TfL table stores names rather than IDs. No schema changes or external services were added.

Verification: production build passes. All 75 runnable tests pass, including five new ticker logic tests; five database integration tests require external configuration and are skipped. Existing global lint warnings remain; the changed JavaScript files pass targeted lint. Browser verification script is tmp/live-ticker/check.cjs and uses isolated illustrative fixtures, never production inserts.

Browser verification passed at 375px width using isolated fixtures: no horizontal overflow, maximum three selections, station search, persistence after reload, Apply and Escape. Screenshots: tmp/live-ticker/default-mobile.png, filter-mobile.png, selected-mobile.png. Production files were intercepted locally to bypass preview networking restrictions.

See live-ticker-verification.md for the later detailed acceptance audit and its limits.
