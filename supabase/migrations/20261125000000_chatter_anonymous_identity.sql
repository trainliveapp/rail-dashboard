create table if not exists public.chat_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint chat_profiles_handle_format check (handle ~ '^guest[0-9a-f]{12}$'),
  constraint chat_profiles_display_name_valid check (
    char_length(btrim(display_name)) between 2 and 32
    and display_name !~ '[[:cntrl:]]'
    and lower(btrim(display_name)) not in (
      'admin', 'administrator', 'moderator', 'official',
      'station live', 'station live guest', 'station live moderator', 'station live user',
      'trainlive', 'trainlive guest', 'trainlive staff', 'trainlive user', 'support', 'system'
    )
  )
);

alter table public.chat_profiles enable row level security;

drop policy if exists "Chat profiles are public" on public.chat_profiles;
create policy "Chat profiles are public"
  on public.chat_profiles for select to anon, authenticated
  using (true);

revoke all on public.chat_profiles from public, anon, authenticated;
grant select (handle, display_name) on public.chat_profiles to anon, authenticated;

alter table public.chat_messages
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists author_handle text,
  add column if not exists client_message_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_messages_author_fields_consistent'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_author_fields_consistent check (
        author_id is null
        or (author_handle is not null and client_message_id is not null)
      );
  end if;
end;
$$;

create unique index if not exists chat_messages_author_client_message_uidx
  on public.chat_messages (author_id, client_message_id)
  where author_id is not null and client_message_id is not null;

create index if not exists chat_messages_author_created_at_idx
  on public.chat_messages (author_id, created_at desc)
  where author_id is not null;

alter table public.chat_messages enable row level security;
drop policy if exists "Public can read chat messages" on public.chat_messages;
create policy "Public can read chat messages"
  on public.chat_messages for select to anon, authenticated
  using (true);

create or replace function public.create_chat_profile_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handle text;
  v_attempt integer;
begin
  if p_user_id is null then
    raise exception 'CHAT_PROFILE_USER_REQUIRED';
  end if;

  if exists (select 1 from public.chat_profiles where user_id = p_user_id) then
    return;
  end if;

  for v_attempt in 1..10 loop
    v_handle := 'guest' || substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12);
    begin
      insert into public.chat_profiles (user_id, handle, display_name)
      values (p_user_id, v_handle, 'Guest ' || upper(right(v_handle, 4)));
      return;
    exception when unique_violation then
      if exists (select 1 from public.chat_profiles where user_id = p_user_id) then
        return;
      end if;
    end;
  end loop;

  raise exception 'CHAT_HANDLE_ALLOCATION_FAILED';
end;
$$;

create or replace function public.create_chat_profile_after_auth_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_chat_profile_for_user(new.id);
  return new;
end;
$$;

revoke all on function public.create_chat_profile_for_user(uuid) from public, anon, authenticated;
revoke all on function public.create_chat_profile_after_auth_insert() from public, anon, authenticated;

drop trigger if exists create_chat_profile_after_auth_insert on auth.users;
create trigger create_chat_profile_after_auth_insert
  after insert on auth.users
  for each row execute function public.create_chat_profile_after_auth_insert();

do $$
declare
  v_user_id uuid;
begin
  for v_user_id in select id from auth.users loop
    perform public.create_chat_profile_for_user(v_user_id);
  end loop;
end;
$$;

create or replace function public.get_my_chat_profile()
returns table (handle text, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'CHAT_AUTH_REQUIRED';
  end if;

  perform public.create_chat_profile_for_user(v_user_id);
  return query
    select p.handle, p.display_name
    from public.chat_profiles p
    where p.user_id = v_user_id;
end;
$$;

create or replace function public.set_chat_display_name(p_display_name text)
returns table (handle text, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'CHAT_AUTH_REQUIRED';
  end if;
  if p_display_name is null or p_display_name ~ '[[:cntrl:]]' then
    raise exception 'CHAT_DISPLAY_NAME_INVALID';
  end if;

  v_display_name := regexp_replace(btrim(p_display_name), '[[:space:]]+', ' ', 'g');
  if char_length(v_display_name) not between 2 and 32
     or lower(v_display_name) in (
       'admin', 'administrator', 'moderator', 'official',
       'station live', 'station live guest', 'station live moderator', 'station live user',
       'trainlive', 'trainlive guest', 'trainlive staff', 'trainlive user', 'support', 'system'
     ) then
    raise exception 'CHAT_DISPLAY_NAME_INVALID';
  end if;

  update public.chat_profiles p
    set display_name = v_display_name
    where p.user_id = v_user_id;
  if not found then
    raise exception 'CHAT_PROFILE_NOT_FOUND';
  end if;

  return query
    select p.handle, p.display_name
    from public.chat_profiles p
    where p.user_id = v_user_id;
end;
$$;

revoke all on function public.get_my_chat_profile() from public, anon, authenticated;
revoke all on function public.set_chat_display_name(text) from public, anon, authenticated;
grant execute on function public.get_my_chat_profile() to authenticated;
grant execute on function public.set_chat_display_name(text) to authenticated;

drop policy if exists "Anyone can post chat messages" on public.chat_messages;
revoke insert, update, delete on public.chat_messages from public, anon, authenticated;
grant select on public.chat_messages to anon, authenticated;

create or replace function public.send_chat_message(
  p_client_message_id uuid,
  p_message text,
  p_line text,
  p_channel_id text,
  p_image_url text default null,
  p_video_url text default null
)
returns setof public.chat_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.chat_profiles%rowtype;
  v_saved public.chat_messages%rowtype;
  v_message text := coalesce(p_message, '');
  v_sent_count integer;
begin
  if v_user_id is null then
    raise exception 'CHAT_AUTH_REQUIRED';
  end if;
  if p_client_message_id is null then
    raise exception 'CHAT_CLIENT_MESSAGE_ID_REQUIRED';
  end if;
  if p_line is null or p_channel_id is null
     or btrim(p_line) = '' or btrim(p_channel_id) = '' then
    raise exception 'CHAT_CHANNEL_INVALID';
  end if;
  if char_length(v_message) > 2000 then
    raise exception 'CHAT_MESSAGE_TOO_LONG';
  end if;
  if btrim(v_message) = '' and p_image_url is null and p_video_url is null then
    raise exception 'CHAT_MESSAGE_EMPTY';
  end if;

  perform public.create_chat_profile_for_user(v_user_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user_id::text));

  select * into v_saved
    from public.chat_messages m
    where m.author_id = v_user_id
      and m.client_message_id = p_client_message_id;
  if found then
    return next v_saved;
    return;
  end if;

  select count(*) into v_sent_count
    from public.chat_messages m
    where m.author_id = v_user_id
      and m.created_at >= now() - interval '1 minute';
  if v_sent_count >= 10 then
    raise exception 'CHAT_RATE_LIMITED';
  end if;

  select * into v_profile
    from public.chat_profiles p
    where p.user_id = v_user_id;

  insert into public.chat_messages (
    username, message, line, channel_id, image_url, video_url,
    author_id, author_handle, client_message_id
  )
  values (
    v_profile.display_name, v_message, p_line, p_channel_id, p_image_url, p_video_url,
    v_user_id, v_profile.handle, p_client_message_id
  )
  on conflict (author_id, client_message_id)
    where author_id is not null and client_message_id is not null
    do nothing
  returning * into v_saved;

  if not found then
    select * into v_saved
      from public.chat_messages m
      where m.author_id = v_user_id
        and m.client_message_id = p_client_message_id;
  end if;

  return next v_saved;
end;
$$;

revoke all on function public.send_chat_message(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.send_chat_message(uuid, text, text, text, text, text) to authenticated;

drop policy if exists "Chat participants can add reactions" on public.chat_message_reactions;
create policy "Chat participants can add reactions"
  on public.chat_message_reactions for insert to authenticated
  with check (user_id = auth.uid() and visitor_id is null);

drop policy if exists "Chat participants can change reactions" on public.chat_message_reactions;
create policy "Chat participants can change reactions"
  on public.chat_message_reactions for update to authenticated
  using (user_id = auth.uid() and visitor_id is null)
  with check (user_id = auth.uid() and visitor_id is null);

drop policy if exists "Chat participants can remove reactions" on public.chat_message_reactions;
create policy "Chat participants can remove reactions"
  on public.chat_message_reactions for delete to authenticated
  using (user_id = auth.uid() and visitor_id is null);

notify pgrst, 'reload schema';
