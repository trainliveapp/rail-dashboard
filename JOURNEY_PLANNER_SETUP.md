# Journey Planner — Implementation Complete ✅

## What Was Done

### 1. **Created `src/lib/savedJourneys.js`** (NEW)
Supabase service layer for persisting journey data:
- `saveJourney(journey)` - Save a journey search
- `getSavedJourneys()` - Fetch all saved journeys for current user
- `deleteSavedJourney(journeyId)` - Remove a saved journey
- `toggleFavorite(journeyId, isFavorite)` - Mark/unmark as favorite
- `getJourneyHistory()` - Fetch last 20 searches
- `trackJourneySearch(journey)` - Auto-track when journey is planned

All functions use Supabase auth to isolate data per user (no cross-user data leakage).

### 2. **Updated `src/lib/useJourneyPlanner.js`**
Added state management for saved data:
- New state: `savedJourneys`, `journeyHistory`, `loadingSaved`, `savingJourney`, `saveError`
- New handlers:
  - `handleSaveJourney()` - Persists current search to Supabase
  - `handleLoadSavedJourney()` - Auto-fills search fields
  - `handleDeleteSavedJourney()` - Removes from Supabase
  - `handleToggleFavorite()` - Updates favorite status
- Auto-load saved journeys on component mount
- Auto-track journey searches when planned
- **Changed default tab from `'saved'` to `'leave'`** (better UX)

### 3. **Updated `src/components/JourneyPlannerPanel.jsx`**
Wired UI to real data:
- Removed mock `savedJourneys` import
- Added "Save Current" button → calls `handleSaveJourney()`
- Display real saved journeys (not mock)
- Added favorite/delete buttons on hover
- Added loading state while fetching data
- Display journey history (last 5 recent searches)
- Proper error handling with error messages
- Loading indicators for async operations

### 4. **Created Supabase Migration** `supabase/migrations/20240818000000_journey_planner_schema.sql`
Two new tables with RLS (Row Level Security):
- **`saved_journeys`** - User's saved routes
  - Columns: id, user_id, from_station_{id,name,lat,lng}, to_station_{id,name,lat,lng}, is_favorite, created_at, updated_at
  - Indexes on user_id, created_at, is_favorite
  - RLS: Users can only see/modify their own saved journeys
- **`journey_history`** - Auto-tracked searches
  - Columns: id, user_id, from_station_{id,name,lat,lng}, to_station_{id,name,lat,lng}, searched_at
  - Indexes on user_id, searched_at
  - RLS: Users can only see their own history

---

## Setup Instructions

### Step 1: Run Database Migration
In your Supabase console:
1. Go to **SQL Editor** → **New Query**
2. Copy the entire contents of `supabase/migrations/20240818000000_journey_planner_schema.sql`
3. Run it

Or use CLI:
```bash
supabase db push
```

### Step 2: Verify Environment Variables
Make sure `.env.local` has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TRANSPORTAPI_APP_ID=your_transport_api_id
VITE_TRANSPORTAPI_APP_KEY=your_transport_api_key
```

### Step 3: Test It
1. Start dev server: `npm run dev`
2. Sign in (existing auth should work)
3. Plan a journey (from → to)
4. Click "Save Current" in the "Saved Journey" tab
5. Should see it appear in the dropdown
6. Click heart to favorite, trash to delete
7. Refresh page → saved journeys should persist
8. Recent searches should show in "RECENT" section

---

## What Users Can Now Do

✅ **Save Journeys** - Save favorite routes for quick reuse
✅ **Mark Favorites** - Heart icon to star important routes
✅ **Auto-Track History** - Last 20 searches auto-recorded (private)
✅ **One-Click Load** - Click saved journey to auto-fill fields
✅ **Delete** - Remove unwanted saved journeys
✅ **Default Tab Fixed** - Opens on "Leave now" instead of empty "Saved"
✅ **Auth Required** - Users must be signed in to save

---

## How It Works (Technical Flow)

1. **User plans journey** → TransportAPI returns options
2. **User clicks "Save Current"** → `handleSaveJourney()` → Insert to `saved_journeys` table
3. **Journey is planned** → `trackJourneySearch()` → Insert to `journey_history` table (auto)
4. **Page loads/refreshes** → `useEffect` → `getSavedJourneys()` + `getJourneyHistory()`
5. **User clicks saved journey** → `handleLoadSavedJourney()` → Auto-fill from/to fields
6. **User clicks heart** → `handleToggleFavorite()` → Update `is_favorite` flag
7. **User clicks trash** → `handleDeleteSavedJourney()` → Delete from table

---

## Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| Save journeys | ✅ DONE | Persisted to Supabase |
| Load saved | ✅ DONE | One-click auto-fill |
| Favorites | ✅ DONE | Heart icon, sortable |
| History | ✅ DONE | Last 20, auto-tracked |
| Delete | ✅ DONE | Immediate removal |
| Auth check | ✅ DONE | Only logged-in users |
| Loading states | ✅ DONE | Spinners for async |
| Error messages | ✅ DONE | Displayed in UI |
| Default tab | ✅ DONE | Changed to "leave" |

---

## What's NOT Included (Future Enhancements)

- [ ] Date/time selection (one-way only, today only)
- [ ] Return journeys (round-trip)
- [ ] Passenger count
- [ ] Railcard pricing
- [ ] Fare information
- [ ] Advanced sorting (cheapest/fastest)
- [ ] Tests (no test framework in project)
- [ ] Share journeys with others

---

## Files Modified

- ✅ `src/lib/savedJourneys.js` (NEW - 142 lines)
- ✅ `src/lib/useJourneyPlanner.js` (MODIFIED - added 100+ lines)
- ✅ `src/components/JourneyPlannerPanel.jsx` (MODIFIED - wired handlers)
- ✅ `supabase/migrations/20240818000000_journey_planner_schema.sql` (NEW - 72 lines)

No other files were modified. No duplicate code or dead code left behind.

---

## Testing Checklist

After migration, verify:
- [ ] Can sign in
- [ ] Can plan a journey
- [ ] "Save Current" button works (becomes active when both stations selected)
- [ ] Saved journey appears in dropdown immediately
- [ ] Heart icon toggles favorite status
- [ ] Trash icon deletes journey
- [ ] Page refresh → saved journeys still there
- [ ] Recent section shows last searches
- [ ] Error handling works (try to save without selecting stations)
- [ ] Default tab is "Leave now" (not "Saved")

---

## Troubleshooting

**"Must be signed in to save journeys"**
- User must be logged in. Sign in first, then save.

**Saved journeys not appearing**
- Check Supabase RLS policies (should have been created by migration)
- Check browser console for errors
- Verify `saved_journeys` table exists in Supabase

**"Error saving journey" message**
- Check network tab in dev tools
- Verify Supabase credentials in `.env.local`
- Check Supabase project status

**History not showing**
- History only appears after journey is planned
- History requires user to be signed in
- Check if `journey_history` table was created

---

Generated: 2026-08-18
