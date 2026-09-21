create table if not exists public.station_update_anonymous_confirmations (
  update_id uuid not null references public.station_updates(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (update_id, visitor_id)
);

alter table public.station_update_anonymous_confirmations enable row level security;

drop function if exists public.increment_confirms(uuid);

create or replace function public.increment_confirms(update_id uuid, visitor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmation_added boolean := false;
begin
  if auth.uid() is null then
    if visitor_id is null then
      raise exception 'Anonymous visitor ID is required';
    end if;

    insert into public.station_update_anonymous_confirmations (update_id, visitor_id)
    values (update_id, visitor_id)
    on conflict do nothing
    returning true into confirmation_added;

    if not confirmation_added then
      return;
    end if;

    update public.station_updates
    set confirms = confirms + 1,
        status = case when confirms + 1 >= 3 then 'CONFIRMED' else status end,
        updated_at = now()
    where id = update_id
      and kind = 'report'
      and status not in ('RESOLVED', 'EXPIRED');
    return;
  end if;

  insert into public.station_update_confirmations (update_id, user_id)
  values (update_id, auth.uid())
  on conflict do nothing
  returning true into confirmation_added;

  if confirmation_added then
    update public.station_updates
    set confirms = confirms + 1,
        status = case when confirms + 1 >= 3 then 'CONFIRMED' else status end,
        updated_at = now()
    where id = update_id
      and kind = 'report'
      and status not in ('RESOLVED', 'EXPIRED');
  end if;
end;
$$;

grant execute on function public.increment_confirms(uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
