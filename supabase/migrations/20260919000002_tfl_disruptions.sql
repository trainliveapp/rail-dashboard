create table if not exists public.tfl_disruptions (
  source_key text primary key,
  line_names text[] not null default '{}',
  severity integer not null default 10,
  status_description text not null,
  reason text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists tfl_disruptions_active_idx
  on public.tfl_disruptions (resolved_at, severity, last_seen_at desc);

alter table public.tfl_disruptions enable row level security;
drop policy if exists "Public can read active TfL disruptions" on public.tfl_disruptions;
create policy "Public can read active TfL disruptions"
  on public.tfl_disruptions for select using (
    resolved_at is null and last_seen_at >= now() - interval '24 hours'
  );

notify pgrst, 'reload schema';
