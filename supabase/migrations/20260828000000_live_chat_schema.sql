create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  username text not null default 'TrainLive User',
  message text not null,
  line text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_line_created_at
  on public.chat_messages (line, created_at asc);

alter table public.chat_messages enable row level security;

drop policy if exists "Public can read chat messages" on public.chat_messages;
create policy "Public can read chat messages"
  on public.chat_messages for select using (true);

drop policy if exists "Anyone can post chat messages" on public.chat_messages;
create policy "Anyone can post chat messages"
  on public.chat_messages for insert to anon, authenticated
  with check (
    username is not null and
    message is not null and
    line is not null
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
exception when duplicate_object then
  null;
end $$;
