create table if not exists public.exposure_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  exposure_count integer not null default 1,
  last_exposed_at timestamptz not null default now(),
  last_action_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, item_id)
);

create index if not exists exposure_tracking_user_idx on public.exposure_tracking(user_id, last_exposed_at desc);
create index if not exists exposure_tracking_item_idx on public.exposure_tracking(item_id);

alter table public.exposure_tracking enable row level security;

create policy exposure_tracking_owner_rw on public.exposure_tracking
for all
using (auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
with check (auth.uid() = (select u.auth_id from public.users u where u.id = user_id));

create or replace function public.update_exposure_tracking(
  p_user_id uuid,
  p_item_id uuid,
  p_action_type text default 'impression'
)
returns void
language plpgsql
as $$
begin
  insert into public.exposure_tracking (user_id, item_id, exposure_count, last_exposed_at, last_action_at)
  values (p_user_id, p_item_id, 1, now(), 
          case when p_action_type != 'impression' then now() else null end)
  on conflict (user_id, item_id) 
  do update set
    exposure_count = exposure_tracking.exposure_count + 1,
    last_exposed_at = now(),
    last_action_at = case 
      when p_action_type != 'impression' then now() 
      else exposure_tracking.last_action_at 
    end;
end;
$$;

create or replace function public.get_exposure_dampening(
  p_user_id uuid,
  p_item_id uuid,
  p_max_exposures integer default 5,
  p_dampening_days integer default 7
)
returns real
language plpgsql
as $$
declare
  exposure_record record;
  dampening_factor real := 1.0;
begin
  select exposure_count, last_exposed_at, last_action_at
  into exposure_record
  from public.exposure_tracking
  where user_id = p_user_id and item_id = p_item_id;
  
  if not found then
    return 1.0;
  end if;
  
  if exposure_record.exposure_count > p_max_exposures and 
     (exposure_record.last_action_at is null or 
      exposure_record.last_action_at < now() - interval '1 day' * p_dampening_days) then
    dampening_factor := 0.3;
  elsif exposure_record.exposure_count > p_max_exposures / 2 then
    dampening_factor := 0.7;
  end if;
  
  return dampening_factor;
end;
$$;
