-- Create saved_journeys table for storing user's saved journey searches
create table if not exists public.saved_journeys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_station_id text not null,
  from_station_name text not null,
  from_lat float not null,
  from_lng float not null,
  to_station_id text not null,
  to_station_name text not null,
  to_lat float not null,
  to_lng float not null,
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better query performance
create index if not exists idx_saved_journeys_user_id on public.saved_journeys(user_id);
create index if not exists idx_saved_journeys_created_at on public.saved_journeys(created_at desc);
create index if not exists idx_saved_journeys_is_favorite on public.saved_journeys(is_favorite);

-- Enable Row Level Security
alter table public.saved_journeys enable row level security;

-- Create RLS policy: users can only see their own saved journeys
create policy "Users can view their own saved journeys" on public.saved_journeys
  for select using (auth.uid() = user_id);

-- Create RLS policy: users can insert their own saved journeys
create policy "Users can insert their own saved journeys" on public.saved_journeys
  for insert with check (auth.uid() = user_id);

-- Create RLS policy: users can update their own saved journeys
create policy "Users can update their own saved journeys" on public.saved_journeys
  for update using (auth.uid() = user_id);

-- Create RLS policy: users can delete their own saved journeys
create policy "Users can delete their own saved journeys" on public.saved_journeys
  for delete using (auth.uid() = user_id);

-- Create journey_history table for tracking all journey searches
create table if not exists public.journey_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_station_id text not null,
  from_station_name text not null,
  from_lat float not null,
  from_lng float not null,
  to_station_id text not null,
  to_station_name text not null,
  to_lat float not null,
  to_lng float not null,
  searched_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better query performance
create index if not exists idx_journey_history_user_id on public.journey_history(user_id);
create index if not exists idx_journey_history_searched_at on public.journey_history(searched_at desc);

-- Enable Row Level Security
alter table public.journey_history enable row level security;

-- Create RLS policy: users can only see their own journey history
create policy "Users can view their own journey history" on public.journey_history
  for select using (auth.uid() = user_id);

-- Create RLS policy: users can insert their own journey history
create policy "Users can insert their own journey history" on public.journey_history
  for insert with check (auth.uid() = user_id);

-- Auto-prune old history entries (keep last 100 per user)
-- This is a note: Run this periodically or use a database function
-- For now, the app handles this in the UI by limiting queries to 20 results
