# Report selections

Apply `20261031000000_station_report_cooldown.sql` followed by
`20261031000001_report_cooldown_per_icon.sql` before deploying the report UI.

Each account or private guest token gets one contribution per station and issue
category within 30 minutes. Icons work independently. Deselecting resolves that
contribution; selecting it again restores the same report and retains the
original window. Duplicate requests return the existing report. New rows can
only be created after that icon's 30-minute window ends.

The second migration preserves existing selections. Report state is refreshed
from Supabase and cached in the browser for reopening and reloads. Direct table
writes cannot bypass the reporting functions.
