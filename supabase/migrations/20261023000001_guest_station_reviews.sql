-- Guest reviews use a private browser token, without creating an auth account.
begin;
-- Include prerequisites so this also works when the strict migration was skipped.
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

alter table public.station_ratings enable row level security;
drop policy if exists "Anyone can submit station ratings" on public.station_ratings;
drop policy if exists "Public can read station ratings" on public.station_ratings;
create policy "Public can read station ratings" on public.station_ratings
  for select to anon, authenticated using (superseded_at is null);
revoke insert, update, delete on public.station_ratings from public, anon, authenticated;
grant select on public.station_ratings to anon, authenticated;

create or replace view public.station_review_scores with (security_invoker = true) as
select station_id, avg(overall_rating) as overall_score, count(*) as rating_count,
  avg(staff_friendliness) as staff_friendliness_avg, avg(accessibility) as accessibility_avg,
  avg(staff_visibility) as staff_visibility_avg, avg(cleanliness) as cleanliness_avg,
  avg(facilities) as facilities_avg
from public.station_ratings where superseded_at is null group by station_id;
grant select on public.station_review_scores to anon, authenticated;

create table if not exists public.station_review_guest_keys (
  station_id text not null,
  token_hash text not null,
  review_id uuid not null unique references public.station_ratings(id) on delete cascade,
  primary key (station_id, token_hash)
);
alter table public.station_review_guest_keys enable row level security;
revoke all on public.station_review_guest_keys from public, anon, authenticated;

drop function if exists public.save_station_review(text, jsonb, text);
create or replace function public.save_station_review(
  p_station_id text, p_ratings jsonb, p_review_text text, p_guest_token uuid
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  reviewer_id uuid := auth.uid();
  station text := btrim(p_station_id);
  guest_hash text;
  rating record;
  has_rating boolean := false;
  review_body text := nullif(regexp_replace(p_review_text, '^\s+|\s+$', '', 'g'), '');
  saved_id uuid;
begin
  if station is null or station = '' or char_length(p_station_id) > 200 then
    raise exception using errcode = '22023', message = 'Choose a valid station.';
  end if;
  if reviewer_id is null and p_guest_token is null then
    raise exception using errcode = '22023', message = 'A guest review token is required.';
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

  if reviewer_id is null then
    guest_hash := encode(sha256(convert_to(p_guest_token::text, 'UTF8')), 'hex');
    -- Serialize concurrent first saves for the same guest and station.
    perform pg_advisory_xact_lock(hashtextextended(station || ':' || guest_hash, 0));
    select review_id into saved_id from public.station_review_guest_keys
      where station_id = station and token_hash = guest_hash;
    if saved_id is not null then
      update public.station_ratings set
        staff_friendliness = (p_ratings->>'staff_friendliness')::numeric::integer,
        accessibility = (p_ratings->>'accessibility')::numeric::integer,
        staff_visibility = (p_ratings->>'staff_visibility')::numeric::integer,
        cleanliness = (p_ratings->>'cleanliness')::numeric::integer,
        facilities = (p_ratings->>'facilities')::numeric::integer,
        review_text = review_body, updated_at = now()
      where id = saved_id;
      return saved_id;
    end if;
  end if;

  insert into public.station_ratings (
    station_id, user_id, staff_friendliness, accessibility, staff_visibility,
    cleanliness, facilities, review_text, updated_at
  ) values (
    station, reviewer_id, (p_ratings->>'staff_friendliness')::numeric::integer,
    (p_ratings->>'accessibility')::numeric::integer, (p_ratings->>'staff_visibility')::numeric::integer,
    (p_ratings->>'cleanliness')::numeric::integer, (p_ratings->>'facilities')::numeric::integer,
    review_body, now()
  )
  on conflict (station_id, user_id) where user_id is not null and superseded_at is null
  do update set staff_friendliness = excluded.staff_friendliness,
    accessibility = excluded.accessibility, staff_visibility = excluded.staff_visibility,
    cleanliness = excluded.cleanliness, facilities = excluded.facilities,
    review_text = excluded.review_text, updated_at = now()
  returning id into saved_id;

  if reviewer_id is null then
    insert into public.station_review_guest_keys (station_id, token_hash, review_id)
      values (station, guest_hash, saved_id);
  end if;
  return saved_id;
end;
$$;

create or replace function public.get_my_station_review(p_station_id text, p_guest_token uuid)
returns table (
  id uuid, review_text text, staff_friendliness integer, accessibility integer,
  staff_visibility integer, cleanliness integer, facilities integer
)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.review_text, r.staff_friendliness, r.accessibility,
    r.staff_visibility, r.cleanliness, r.facilities
  from public.station_ratings r
  where r.station_id = btrim(p_station_id) and r.superseded_at is null
    and (
      (auth.uid() is not null and r.user_id = auth.uid())
      or (auth.uid() is null and p_guest_token is not null and exists (
        select 1 from public.station_review_guest_keys g
        where g.review_id = r.id and g.station_id = r.station_id
          and g.token_hash = encode(sha256(convert_to(p_guest_token::text, 'UTF8')), 'hex')
      ))
    )
  order by r.created_at desc, r.id desc limit 1;
$$;

revoke all on function public.save_station_review(text, jsonb, text, uuid) from public;
revoke all on function public.get_my_station_review(text, uuid) from public;
grant execute on function public.save_station_review(text, jsonb, text, uuid) to anon, authenticated;
grant execute on function public.get_my_station_review(text, uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
