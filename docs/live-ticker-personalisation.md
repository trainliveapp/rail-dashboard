# LIVE ticker personalisation

Changed files: src/components/TopPromoBar.jsx, src/components/LiveTickerPreferences.jsx, src/lib/liveTicker.js, src/index.css, tests/liveTicker.test.js.

The original single-row yellow strip, red dot, fixed LIVE label and scrolling ticker remain in place. A fixed two-line Tune icon opens a responsive native dialog with keyboard focus containment, Escape, Close, Clear and Apply. Users choose up to three canonical station IDs; station search and versioned localStorage preferences need no account. An empty selection means All updates. Reduced motion stops the animation and allows manual horizontal scrolling.

Data comes from existing station_updates, reports/report_lines, stations, lines/colour, station_lines, and tfl_disruptions. Canonical reports share IDs with station_updates, then reports.station_id links to the canonical station. Legacy station names are matched exactly to the station catalogue; unknown names and retired station IDs do not match a selected station. Interchanges retain all applicable line IDs without duplicating a report. Only a single-line passenger report receives that line's darker colour on its text; multi-line, unknown and operator updates remain neutral. Contrast is measured against the actual #facc15 ticker background. Passenger reports and community messages are labelled unverified; TfL notices are labelled by source.

Filtering policy: the station preference includes only rows associated with one of the selected canonical station IDs. The current TfL disruptions table stores line names, severity, and notice text, but no station relationship or trusted network-wide critical flag. TfL line notices and unattributed updates therefore remain visible in All updates mode and are excluded in station mode. No critical classification is inferred from prose or severity. A trusted critical-network-wide bypass needs an explicit source field and product definition; none currently exists. Official notices are not coloured by line because their line-name association is not a canonical station relationship. No schema changes or external services were added.

Verification: production build passes. All 75 runnable tests pass, including five new ticker logic tests; five database integration tests require external configuration and are skipped. Existing global lint warnings remain; the changed JavaScript files pass targeted lint. Browser verification script is tmp/live-ticker/check.cjs and uses isolated illustrative fixtures, never production inserts.

Browser verification passed at 375px width using isolated fixtures: no horizontal overflow, maximum three selections, station search, persistence after reload, Apply and Escape. Screenshots: tmp/live-ticker/default-mobile.png, filter-mobile.png, selected-mobile.png. Production files were intercepted locally to bypass preview networking restrictions.

See live-ticker-verification.md for the later detailed acceptance audit and its limits.
