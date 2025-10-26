
drop index if exists items_embedding_vec_ivfflat_idx;
drop index if exists items_embedding_ivfflat_idx;

create index if not exists items_embedding_vec_ivfflat_idx
  on public.items using ivfflat (embedding_vec vector_cosine_ops) 
  with (lists = 200)
  where embedding_vec is not null;

create index if not exists items_embedding_ivfflat_idx
  on public.items using ivfflat (embedding vector_cosine_ops) 
  with (lists = 200)
  where embedding is not null;

create index if not exists idx_items_visibility_location on public.items(visibility, location_point) 
  where visibility = 'public' and location_point is not null;

create index if not exists idx_items_bucket_visibility on public.items(bucket_id, visibility, created_at desc)
  where visibility = 'public';

create index if not exists idx_events_user_type_created on public.events(user_id, event_type, created_at desc);

create index if not exists idx_completions_user_item on public.completions(user_id, item_id, created_at desc);

create index if not exists idx_friendships_user_status on public.friendships(user_id, status) 
  where status = 'accepted';

create index if not exists idx_friendships_friend_status on public.friendships(friend_id, status) 
  where status = 'accepted';

create or replace function public.refresh_recs_materialized()
returns void language plpgsql as $$
begin
  refresh materialized view concurrently public.user_vectors;
  refresh materialized view concurrently public.item_popularity;
  
  analyze public.user_vectors;
  analyze public.item_popularity;
end;
$$;

create or replace function public.get_recommendation_candidates_optimized(
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

  with user_location as (
    select st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography as user_geo
  ),
  uv as (
    select emb from public.user_vectors where user_id = p_user_id
  ),
  geo_filtered as (
    select i.*,
           st_distance(public.item_geog(i), ul.user_geo)/1000.0 as distance_km
    from public.items i
    cross join user_location ul
    where i.visibility = 'public'
      and public.item_geog(i) is not null
      and st_dwithin(public.item_geog(i), ul.user_geo, p_radius_km*1000)
      and (i.embedding is not null or i.embedding_vec is not null)
  ),
  ann_candidates as (
    select gf.*,
           case 
             when gf.embedding_vec is not null then gf.embedding_vec
             else gf.embedding::vector(1536)
           end as emb_use,
           case 
             when gf.embedding_vec is not null then (gf.embedding_vec <-> (select emb from uv))
             else (gf.embedding::vector(1536) <-> (select emb from uv))
           end as similarity_score
    from geo_filtered gf
    order by similarity_score
    limit p_limit * 2
  ),
  pop_data as (
    select id, completes, last_completion_at
    from public.item_popularity
    where id in (select id from ann_candidates)
  ),
  friend_list as (
    select case
             when f.user_id = p_user_id then f.friend_id
             when f.friend_id = p_user_id then f.user_id
           end as fid
    from public.friendships f
    where (f.user_id = p_user_id or f.friend_id = p_user_id)
      and f.status = 'accepted'
  ),
  social_signals as (
    select 
      ac.id,
      count(distinct c.id) as friend_completes,
      count(distinct case when e.event_type = 'save' then e.id end) as friend_saves,
      count(distinct case when e.event_type = 'like' then e.id end) as friend_likes
    from ann_candidates ac
    left join public.completions c on c.item_id = ac.id
    left join friend_list fl1 on fl1.fid = c.user_id
    left join public.events e on e.item_id = ac.id
    left join friend_list fl2 on fl2.fid = e.user_id
    group by ac.id
  ),
  collab_hints as (
    select 
      ac.id,
      exists(
        select 1 from public.bucket_collaborators bc
        join friend_list fl on fl.fid = bc.user_id
        where bc.bucket_id = ac.bucket_id
      ) as collab_hint
    from ann_candidates ac
  )
  select 
    ac.id,
    ac.emb_use as embedding,
    ac.distance_km,
    ac.price_min,
    ac.price_max,
    ac.difficulty,
    ac.visibility,
    ac.created_at,
    coalesce(pd.completes, 0) as completes,
    coalesce(ss.friend_completes, 0) as friend_completes,
    coalesce(ss.friend_saves, 0) as friend_saves,
    coalesce(ss.friend_likes, 0) as friend_likes,
    ac.appeal_score,
    coalesce(ch.collab_hint, false) as collab_hint
  from ann_candidates ac
  left join pop_data pd on pd.id = ac.id
  left join social_signals ss on ss.id = ac.id
  left join collab_hints ch on ch.id = ac.id
  order by ac.similarity_score
  limit p_limit;
$$;

create or replace function public.log_performance_metric(
  p_user_id uuid,
  p_function_name text,
  p_duration_ms integer,
  p_success boolean,
  p_error_message text default null
)
returns void
language plpgsql
as $$
begin
  if p_duration_ms > 100 or not p_success then
    insert into public.recs_performance_logs (
      user_id, function_name, duration_ms, success, error_message
    ) values (
      p_user_id, p_function_name, p_duration_ms, p_success, p_error_message
    );
  end if;
end;
$$;

create or replace function public.analyze_recommendation_performance()
returns table (
  query_name text,
  avg_duration_ms numeric,
  p95_duration_ms numeric,
  success_rate numeric,
  sample_size bigint
)
language sql
as $$
  select 
    function_name as query_name,
    round(avg(duration_ms)::numeric, 2) as avg_duration_ms,
    round(percentile_cont(0.95) within group (order by duration_ms)::numeric, 2) as p95_duration_ms,
    round(sum(case when success then 1 else 0 end)::numeric / count(*)::numeric * 100, 2) as success_rate,
    count(*) as sample_size
  from public.recs_performance_logs
  where created_at >= now() - interval '24 hours'
  group by function_name
  order by avg_duration_ms desc;
$$;



create or replace function public.maintain_recommendation_indexes()
returns void
language plpgsql
as $$
begin
  analyze public.items;
  analyze public.events;
  analyze public.completions;
  analyze public.friendships;
  analyze public.user_vectors;
  analyze public.item_popularity;
  
  if random() < 0.01 then
    reindex index concurrently items_embedding_vec_ivfflat_idx;
    reindex index concurrently items_embedding_ivfflat_idx;
  end if;
end;
$$;


create or replace function public.get_recommendation_candidates_with_timeout(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision,
  p_limit integer default 300,
  p_timeout_ms integer default 5000
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
language plpgsql
as $$
declare
  start_time timestamp;
  end_time timestamp;
begin
  start_time := clock_timestamp();
  
  set local statement_timeout = p_timeout_ms;
  
  return query
  select * from public.get_recommendation_candidates_optimized(
    p_user_id, p_lat, p_lon, p_radius_km, p_limit
  );
  
  end_time := clock_timestamp();
  
  perform public.log_performance_metric(
    p_user_id,
    'get_recommendation_candidates_with_timeout',
    extract(milliseconds from (end_time - start_time))::integer,
    true
  );
  
exception when others then
  end_time := clock_timestamp();
  
  perform public.log_performance_metric(
    p_user_id,
    'get_recommendation_candidates_with_timeout',
    extract(milliseconds from (end_time - start_time))::integer,
    false,
    sqlerrm
  );
  
  raise;
end;
$$;
