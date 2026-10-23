-- One current review per verified account and station. Preserve legacy rows.
begin;
lock table public.station_ratings in share row exclusive mode;

alter table public.station_ratings add column if not exists superseded_at timestamptz;
alter table public.station_ratings add column if not exists updated_at timestamptz not null default now();

with ranked as (
  select id, row_number() over (
    partition by station_id, user_id order by created_at desc, id desc
  ) as position
  from public.station_ratings
  where user_id is not null and superseded_at is null
)
update public.station_ratings as ratings
set superseded_at = now()
from ranked where ratings.id = ranked.id and ranked.position > 1;

create unique index if not exists station_ratings_one_current_review
  on public.station_ratings (station_id, user_id)
  where user_id is not null and superseded_at is null;

drop policy if exists "Anyone can submit station ratings" on public.station_ratings;
drop policy if exists "Public can read station ratings" on public.station_ratings;
create policy "Public can read station ratings" on public.station_ratings
  for select to anon, authenticated using (superseded_at is null);

-- Writes only through the verified RPC. No caller-supplied author IDs or dates.
revoke insert, update, delete on public.station_ratings from public, anon, authenticated;
grant select on public.station_ratings to anon, authenticated;

create or replace function public.save_station_review(
  p_station_id text,
  p_ratings jsonb default '{}'::jsonb,
  p_review_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid := auth.uid();
  rating record;
  has_rating boolean := false;
  review_body text := nullif(regexp_replace(p_review_text, '^\s+|\s+$', '', 'g'), '');
  saved_id uuid;
begin
  if reviewer_id is null then
    raise exception using errcode = '42501', message = 'Sign in to write a review.';
  end if;
  if not exists (
    select 1 from auth.users
    where id = reviewer_id and email_confirmed_at is not null
      and coalesce(is_anonymous, false) = false
  ) then
    raise exception using errcode = '42501', message = 'Verify your email address before writing a review.';
  end if;
  if p_station_id is null or btrim(p_station_id) = '' or char_length(p_station_id) > 200 then
    raise exception using errcode = '22023', message = 'Choose a valid station.';
  end if;
  if p_ratings is null or jsonb_typeof(p_ratings) <> 'object' then
    raise exception using errcode = '22023', message = 'Invalid category ratings.';
  end if;
  for rating in select key, value from jsonb_each(p_ratings) loop
    if not (rating.key = any(array['staff_friendliness', 'accessibility', 'staff_visibility', 'cleanliness', 'facilities'])) then
      raise exception using errcode = '22023', message = 'Invalid rating category.';
    end if;
    if rating.value <> 'null'::jsonb then
      if jsonb_typeof(rating.value) <> 'number' then
        raise exception using errcode = '22023', message = 'Ratings must be whole numbers from 1 to 5.';
      end if;
      if (rating.value::text)::numeric not between 1 and 5
         or trunc((rating.value::text)::numeric) <> (rating.value::text)::numeric then
        raise exception using errcode = '22023', message = 'Ratings must be whole numbers from 1 to 5.';
      end if;
      has_rating := true;
    end if;
  end loop;
  if char_length(review_body) > 500 then
    raise exception using errcode = '22023', message = 'Keep your review within 500 characters.';
  end if;
  if not has_rating and review_body is null then
    raise exception using errcode = '22023', message = 'Add a star rating or write a review before submitting.';
  end if;

  insert into public.station_ratings (
    station_id, user_id, staff_friendliness, accessibility, staff_visibility,
    cleanliness, facilities, review_text, updated_at
  ) values (
    btrim(p_station_id), reviewer_id, (p_ratings->>'staff_friendliness')::numeric::integer,
    (p_ratings->>'accessibility')::numeric::integer, (p_ratings->>'staff_visibility')::numeric::integer,
    (p_ratings->>'cleanliness')::numeric::integer, (p_ratings->>'facilities')::numeric::integer,
    review_body, now()
  )
  on conflict (station_id, user_id) where user_id is not null and superseded_at is null
  do update set
    staff_friendliness = excluded.staff_friendliness,
    accessibility = excluded.accessibility,
    staff_visibility = excluded.staff_visibility,
    cleanliness = excluded.cleanliness,
    facilities = excluded.facilities,
    review_text = excluded.review_text,
    updated_at = now()
  returning id into saved_id;
  return saved_id;
end;
$$;

revoke all on function public.save_station_review(text, jsonb, text) from public, anon;
grant execute on function public.save_station_review(text, jsonb, text) to authenticated;

create or replace view public.station_review_scores with (security_invoker = true) as
select station_id, avg(overall_rating) as overall_score, count(*) as rating_count,
  avg(staff_friendliness) as staff_friendliness_avg, avg(accessibility) as accessibility_avg,
  avg(staff_visibility) as staff_visibility_avg, avg(cleanliness) as cleanliness_avg,
  avg(facilities) as facilities_avg
from public.station_ratings where superseded_at is null group by station_id;

notify pgrst, 'reload schema';
commit;
