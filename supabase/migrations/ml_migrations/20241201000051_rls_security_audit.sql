

drop policy if exists events_owner_rw on public.events;
create policy events_owner_rw on public.events
for all
using (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
)
with check (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
);



drop policy if exists exposure_tracking_owner_rw on public.exposure_tracking;
create policy exposure_tracking_owner_rw on public.exposure_tracking
for all
using (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
)
with check (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
);

drop policy if exists recs_bandit_arms_owner_rw on public.recs_bandit_arms;
create policy recs_bandit_arms_owner_rw on public.recs_bandit_arms
for all
using (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
)
with check (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
);

drop policy if exists recs_rate_limit_owner_rw on public.recs_rate_limit;
create policy recs_rate_limit_owner_rw on public.recs_rate_limit
for all
using (
  auth.uid() is not null and
  (user_id is null or auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
)
with check (
  auth.uid() is not null and
  (user_id is null or auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
);

drop policy if exists recs_cache_owner_rw on public.recs_cache;
create policy recs_cache_owner_rw on public.recs_cache
for all
using (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
)
with check (
  auth.uid() is not null and
  auth.uid() = (select u.auth_id from public.users u where u.id = user_id)
);

drop policy if exists recs_performance_logs_owner_rw on public.recs_performance_logs;
create policy recs_performance_logs_owner_rw on public.recs_performance_logs
for all
using (
  auth.uid() is not null and
  (user_id is null or auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
)
with check (
  auth.uid() is not null and
  (user_id is null or auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
);

create or replace function public.get_recommendation_candidates(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision,
  p_limit integer default 300
)
returns table (
  id uuid,
  embedding vector(1536),
  distance_km double precision,
  price_min integer,
  price_max integer,
  difficulty integer,
  visibility text,
  created_at timestamptz,
  completes bigint,
  friend_completes bigint,
  friend_saves bigint,
  friend_likes bigint,
  appeal_score real,
  collab_hint boolean
) 
language sql 
security definer
set search_path = public
as $$

  with uv as (
    select emb from public.user_vectors where user_id = p_user_id
  ),
  geo as (
    select i.*,
           st_distance(
             public.item_geog(i),
             st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography
           )/1000.0 as distance_km
    from public.items i
    where public.item_geog(i) is not null
      and st_dwithin(
            public.item_geog(i),
            st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography,
            p_radius_km*1000
          )
      and i.visibility = 'public'
  ),
  ann as (
    select g.*,
           case 
             when g.embedding_vec is not null then g.embedding_vec
             else g.embedding::vector(1536)
           end as emb_use
    from geo g
    where (g.embedding is not null or g.embedding_vec is not null)
    order by
      case 
        when g.embedding_vec is not null then (g.embedding_vec <-> (select emb from uv))
        else (g.embedding::vector(1536) <-> (select emb from uv))
      end
    nulls last
    limit p_limit
  ),
  pop as (
    select id, completes, last_completion_at
    from public.item_popularity
  ),
  friends as (
    select case
             when f.user_id = p_user_id then f.friend_id
             when f.friend_id = p_user_id then f.user_id
           end as fid
    from public.friendships f
    where (f.user_id = p_user_id or f.friend_id = p_user_id)
      and f.status = 'accepted'
  ),
  social as (
    select a.id,
           count(c.id) as friend_completes,
           count(case when e.event_type = 'save' then 1 end) as friend_saves,
           count(case when e.event_type = 'like' then 1 end) as friend_likes
    from ann a
    left join public.completions c on c.item_id = a.id
    left join friends fr1 on fr1.fid = c.user_id
    left join public.events e on e.item_id = a.id
    left join friends fr2 on fr2.fid = e.user_id
    group by a.id
  ),
  collab as (
    select a.id,
           exists(
             select 1 from public.bucket_collaborators bc
             join friends f on f.fid = bc.user_id
             where bc.bucket_id = a.bucket_id
           ) as collab_hint
    from ann a
  )
  select a.id,
         a.emb_use as embedding,
         a.distance_km,
         a.price_min,
         a.price_max,
         a.difficulty,
         a.visibility,
         a.created_at,
         coalesce(p.completes,0) as completes,
         coalesce(s.friend_completes,0) as friend_completes,
         coalesce(s.friend_saves,0) as friend_saves,
         coalesce(s.friend_likes,0) as friend_likes,
         a.appeal_score,
         coalesce(c.collab_hint, false) as collab_hint
  from ann a
  left join pop p on p.id = a.id
  left join social s on s.id = a.id
  left join collab c on c.id = a.id;
$$;

create or replace function public.get_user_experiment_variant(
  p_user_id uuid,
  p_experiment_name text
)
returns table (
  experiment_id uuid,
  variant text,
  params jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (auth.uid() is not null and 
          auth.uid() = (select u.auth_id from public.users u where u.id = p_user_id)) then
    raise exception 'Access denied: Invalid user';
  end if;

  return query
  select 
    e.id as experiment_id,
    ea.variant,
    e.params
  from public.recs_experiments e
  join public.recs_experiment_assignments ea on ea.experiment_id = e.id
  where ea.user_id = p_user_id
    and e.name = p_experiment_name
    and e.enabled = true
    and (e.start_date is null or e.start_date <= now())
    and (e.end_date is null or e.end_date >= now());
end;
$$;

create or replace function public.audit_rls_policies()
returns table (
  table_name text,
  policy_name text,
  policy_type text,
  policy_definition text
)
language sql
security definer
as $$
  select 
    schemaname||'.'||tablename as table_name,
    policyname as policy_name,
    permissive as policy_type,
    qual as policy_definition
  from pg_policies 
  where schemaname = 'public'
    and tablename in (
      'events', 'user_vectors', 'item_popularity', 'exposure_tracking',
      'recs_bandit_arms', 'recs_rate_limit', 'recs_cache', 'recs_performance_logs'
    )
  order by tablename, policyname;
$$;

create or replace function public.test_rls_security()
returns table (
  test_name text,
  passed boolean,
  details text
)
language plpgsql
security definer
as $$
declare
  test_user_id uuid;
  other_user_id uuid;
  test_item_id uuid;
  result record;
begin
  select id into test_user_id from public.users limit 1;
  select id into other_user_id from public.users where id != test_user_id limit 1;
  
  begin
    insert into public.events (user_id, item_id, event_type, strength)
    values (other_user_id, (select id from public.items limit 1), 'test', 1.0);
    
    return query select 'events_cross_user_insert'::text, false::boolean, 'Cross-user insert succeeded'::text;
  exception when others then
    return query select 'events_cross_user_insert'::text, true::boolean, 'Cross-user insert blocked'::text;
  end;

  begin
    select * into result from public.user_vectors where user_id = other_user_id limit 1;
    if found then
      return query select 'user_vectors_cross_user_read'::text, false::boolean, 'Cross-user read succeeded'::text;
    else
      return query select 'user_vectors_cross_user_read'::text, true::boolean, 'Cross-user read blocked'::text;
    end if;
  exception when others then
    return query select 'user_vectors_cross_user_read'::text, true::boolean, 'Cross-user read blocked by exception'::text;
  end;

  begin
    select * into result from public.get_recommendation_candidates(other_user_id, 0.0, 0.0, 100.0, 10);
    return query select 'candidate_rpc_cross_user'::text, false::boolean, 'Cross-user RPC succeeded'::text;
  exception when others then
    return query select 'candidate_rpc_cross_user'::text, true::boolean, 'Cross-user RPC blocked'::text;
  end;

  return;
end;
$$;
