create table if not exists public.station_ratings (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  staff_friendliness integer check (staff_friendliness between 1 and 5),
  accessibility integer check (accessibility between 1 and 5),
  staff_visibility integer check (staff_visibility between 1 and 5),
  cleanliness integer check (cleanliness between 1 and 5),
  facilities integer check (facilities between 1 and 5),
  review_text text check (review_text is null or char_length(review_text) <= 500),
  created_at timestamptz not null default now()
);

-- Also upgrade installations that already have the category rating table.
alter table public.station_ratings
  add column if not exists review_text text
    check (review_text is null or char_length(review_text) <= 500);

alter table public.station_ratings
  add column if not exists overall_rating numeric generated always as (
    (coalesce(staff_friendliness, 0) + coalesce(accessibility, 0) +
     coalesce(staff_visibility, 0) + coalesce(cleanliness, 0) + coalesce(facilities, 0))::numeric
    / nullif((staff_friendliness is not null)::integer + (accessibility is not null)::integer +
             (staff_visibility is not null)::integer + (cleanliness is not null)::integer +
             (facilities is not null)::integer, 0)
  ) stored;

alter table public.station_ratings enable row level security;
drop policy if exists "Public can read station ratings" on public.station_ratings;
create policy "Public can read station ratings"
  on public.station_ratings for select using (true);
drop policy if exists "Anyone can submit station ratings" on public.station_ratings;
create policy "Anyone can submit station ratings"
  on public.station_ratings for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create index if not exists station_ratings_station_created_idx
  on public.station_ratings (station_id, created_at desc);

-- A written experience counts as a review even when the passenger skips stars.
create or replace view public.station_review_scores with (security_invoker = true) as
select
  station_id,
  avg(overall_rating) as overall_score,
  count(*) as rating_count,
  avg(staff_friendliness) as staff_friendliness_avg,
  avg(accessibility) as accessibility_avg,
  avg(staff_visibility) as staff_visibility_avg,
  avg(cleanliness) as cleanliness_avg,
  avg(facilities) as facilities_avg
from public.station_ratings
group by station_id;

grant select, insert on public.station_ratings to anon, authenticated;
grant select on public.station_review_scores to anon, authenticated;
