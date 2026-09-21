# TfL Trending Setup

The TfL key must stay in Supabase Edge Function secrets. Do not put it in `.env.local`, `VITE_*`, React code, or the browser.

## 1. Rotate exposed keys

The keys pasted into the chat are exposed. Rotate both the primary and secondary keys in the TfL API Portal before production use. The primary key is the `app_key` used by the sync function.

## 2. Apply the database migration

Run the Supabase migrations, including:

- `20260919000002_tfl_disruptions.sql`

This creates `tfl_disruptions`. Rows remain stored for history, while the public policy only exposes unresolved disruptions seen within 24 hours.

## 3. Store the TfL key as a server secret

From the project root, after installing and linking the Supabase CLI:

```powershell
supabase secrets set TFL_APP_KEY=YOUR_NEW_TFL_PRIMARY_KEY
supabase functions deploy sync-tfl-disruptions
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the deployed function by Supabase. Never commit the service-role key.

## 4. Test one sync

```powershell
supabase functions invoke sync-tfl-disruptions
```

Then open the Trending panel. It should show active TfL disruptions above community reports.

## 5. Schedule polling

Create a Supabase scheduled job or external cron that invokes `sync-tfl-disruptions` every 90 seconds. The function marks disruptions absent from the latest poll as resolved; it does not delete them. The frontend and public database policy hide resolved or older-than-24-hour records.

If the project does not already have a scheduler, use Supabase Dashboard Scheduler/Edge Function cron and target `sync-tfl-disruptions` with the function's normal invoke authorization.
