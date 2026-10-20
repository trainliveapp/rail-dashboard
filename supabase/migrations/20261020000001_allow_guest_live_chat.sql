-- Guests can participate in live chat without creating or signing into an account.
grant select, insert on public.chat_messages to anon, authenticated;
drop policy if exists "Anyone can post chat messages" on public.chat_messages;
create policy "Anyone can post chat messages"
  on public.chat_messages for insert to anon, authenticated
  with check (
    nullif(btrim(username), '') is not null and
    nullif(btrim(line), '') is not null and
    (nullif(btrim(message), '') is not null or image_url is not null or video_url is not null)
  );

grant select, insert on public.station_updates to anon, authenticated;
drop policy if exists "Anyone can post station chat" on public.station_updates;
create policy "Anyone can post station chat"
  on public.station_updates for insert to anon, authenticated
  with check (
    kind = 'chat' and
    (author_id is null or author_id = auth.uid()) and
    nullif(btrim(station_name), '') is not null and
    nullif(btrim(message), '') is not null
  );

-- One reaction per message per signed-in user or guest browser.
create table if not exists public.chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  visitor_id uuid,
  reaction text not null check (char_length(reaction) between 1 and 32),
  created_at timestamptz not null default now(),
  check ((user_id is not null)::integer + (visitor_id is not null)::integer = 1),
  unique (message_id, user_id),
  unique (message_id, visitor_id)
);

alter table public.chat_message_reactions enable row level security;
grant select, insert, update, delete on public.chat_message_reactions to anon, authenticated;

drop policy if exists "Public can read chat reactions" on public.chat_message_reactions;
create policy "Public can read chat reactions"
  on public.chat_message_reactions for select to anon, authenticated using (true);

drop policy if exists "Chat participants can add reactions" on public.chat_message_reactions;
create policy "Chat participants can add reactions"
  on public.chat_message_reactions for insert to anon, authenticated
  with check (user_id = auth.uid() or (user_id is null and visitor_id is not null));

drop policy if exists "Chat participants can change reactions" on public.chat_message_reactions;
create policy "Chat participants can change reactions"
  on public.chat_message_reactions for update to anon, authenticated
  using (user_id = auth.uid() or (user_id is null and visitor_id is not null))
  with check (user_id = auth.uid() or (user_id is null and visitor_id is not null));

drop policy if exists "Chat participants can remove reactions" on public.chat_message_reactions;
create policy "Chat participants can remove reactions"
  on public.chat_message_reactions for delete to anon, authenticated
  using (user_id = auth.uid() or (user_id is null and visitor_id is not null));

-- Uploads use unique filenames; guests do not need overwrite or delete rights.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true), ('chat-videos', 'chat-videos', true)
on conflict (id) do nothing;

drop policy if exists "Chat participants can upload attachments" on storage.objects;
create policy "Chat participants can upload attachments"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id in ('chat-images', 'chat-videos'));

do $$
begin
  alter publication supabase_realtime add table public.chat_message_reactions;
exception when duplicate_object then
  null;
end $$;

notify pgrst, 'reload schema';
