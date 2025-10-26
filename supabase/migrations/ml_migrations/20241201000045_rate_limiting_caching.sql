create table if not exists public.recs_rate_limit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  ip_address inet,
  request_count integer not null default 1,
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, window_start),
  unique(ip_address, window_start)
);

create index if not exists recs_rate_limit_user_idx on public.recs_rate_limit(user_id, window_start desc);
create index if not exists recs_rate_limit_ip_idx on public.recs_rate_limit(ip_address, window_start desc);

alter table public.recs_rate_limit enable row level security;

create policy recs_rate_limit_owner_rw on public.recs_rate_limit
for all
using (auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
with check (auth.uid() = (select u.auth_id from public.users u where u.id = user_id));

create table if not exists public.recs_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  geohash5 text not null,
  hour_bucket integer not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id, geohash5, hour_bucket)
);

create index if not exists recs_cache_user_idx on public.recs_cache(user_id, expires_at desc);
create index if not exists recs_cache_expires_idx on public.recs_cache(expires_at);

alter table public.recs_cache enable row level security;

create policy recs_cache_owner_rw on public.recs_cache
for all
using (auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
with check (auth.uid() = (select u.auth_id from public.users u where u.id = user_id));

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_ip_address inet,
  p_limit integer default 30,
  p_window_minutes integer default 10
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
as $$
declare
  window_start timestamptz;
  current_count integer;
  user_record record;
  ip_record record;
begin
  window_start := date_trunc('minute', now() - interval '1 minute' * p_window_minutes);
  
  select request_count
  into user_record
  from public.recs_rate_limit
  where user_id = p_user_id and window_start >= window_start
  order by window_start desc
  limit 1;
  
  select request_count
  into ip_record
  from public.recs_rate_limit
  where ip_address = p_ip_address and window_start >= window_start
  order by window_start desc
  limit 1;
  
  current_count := coalesce(user_record.request_count, 0) + coalesce(ip_record.request_count, 0);
  
  if current_count >= p_limit then
    return query select false, 0, window_start + interval '1 minute' * p_window_minutes;
  else
    return query select true, p_limit - current_count, window_start + interval '1 minute' * p_window_minutes;
  end if;
end;
$$;

create or replace function public.increment_rate_limit(
  p_user_id uuid,
  p_ip_address inet
)
returns void
language plpgsql
as $$
declare
  window_start timestamptz;
begin
  window_start := date_trunc('minute', now());
  
  insert into public.recs_rate_limit (user_id, window_start, request_count)
  values (p_user_id, window_start, 1)
  on conflict (user_id, window_start)
  do update set request_count = recs_rate_limit.request_count + 1;
  
  insert into public.recs_rate_limit (ip_address, window_start, request_count)
  values (p_ip_address, window_start, 1)
  on conflict (ip_address, window_start)
  do update set request_count = recs_rate_limit.request_count + 1;
end;
$$;

create or replace function public.get_cached_recommendations(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision
)
returns jsonb
language plpgsql
as $$
declare
  geohash5 text;
  hour_bucket integer;
  cache_record record;
begin
  geohash5 := substring(md5(p_lat::text || p_lon::text), 1, 5);
  hour_bucket := extract(hour from now());
  
  select payload
  into cache_record
  from public.recs_cache
  where user_id = p_user_id 
    and geohash5 = geohash5
    and hour_bucket = hour_bucket
    and expires_at > now();
  
  if found then
    return cache_record.payload;
  else
    return null;
  end if;
end;
$$;

create or replace function public.cache_recommendations(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision,
  p_payload jsonb,
  p_ttl_minutes integer default 5
)
returns void
language plpgsql
as $$
declare
  geohash5 text;
  hour_bucket integer;
begin
  geohash5 := substring(md5(p_lat::text || p_lon::text), 1, 5);
  hour_bucket := extract(hour from now());
  
  insert into public.recs_cache (user_id, geohash5, hour_bucket, payload, expires_at)
  values (p_user_id, geohash5, hour_bucket, p_payload, now() + interval '1 minute' * p_ttl_minutes)
  on conflict (user_id, geohash5, hour_bucket)
  do update set 
    payload = p_payload,
    expires_at = now() + interval '1 minute' * p_ttl_minutes;
end;
$$;

create or replace function public.cleanup_expired_cache()
returns integer
language plpgsql
as $$
declare
  deleted_count integer;
begin
  delete from public.recs_cache where expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
