-- Minimal implicit-feedback table aligned to users/items
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  event_type text not null check (event_type in
    ('impression','view','like','save','start','complete','comment','hide','skip')),
  strength float8 not null,               -- e.g., impression 0, view 0.25, like 1, save 1.5, start 2, complete 3, hide -1
  context jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_user_ts_idx on public.events (user_id, created_at desc);
create index if not exists events_item_ts_idx on public.events (item_id, created_at desc);
create index if not exists events_type_idx on public.events (event_type);

-- RLS: users can only read/write their own rows
alter table public.events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='events_owner_rw'
  ) then
    create policy events_owner_rw on public.events
    for all
    using (auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
    with check (auth.uid() = (select u.auth_id from public.users u where u.id = user_id));
  end if;
end $$;
