-- Allow review subscriptions to update the station summary and review list.
do $$
begin
  alter publication supabase_realtime add table public.station_ratings;
exception when duplicate_object then
  null;
end $$;

notify pgrst, 'reload schema';
