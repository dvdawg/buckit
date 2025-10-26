-- Fix embedding dimensions in RPC function to match actual schema (384 dimensions)
create or replace function public.get_recommendation_candidates(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision,
  p_limit integer default 300
)
returns table (
  id uuid,
  embedding vector(384),  -- Fixed to 384 dimensions
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
security definer -- Run with function owner's privileges
set search_path = public
as $$
  -- Note: Security is handled by RLS policies on the underlying tables

  with uv as (
    -- User vectors table may not exist yet, return null embedding
    select null::vector(384) as emb
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
      and i.visibility = 'public' -- Only return public items
  ),
  ann as (
    select g.*,
           g.embedding as emb_use  -- Use embedding directly (384 dimensions)
    from geo g
    where g.embedding is not null
    order by
      g.embedding <-> (select emb from uv)  -- Direct comparison (384 dimensions)
    nulls last
    limit p_limit
  ),
  pop as (
    select id, completes, last_completion_at
    from public.item_popularity
  ),
  friends as (
    -- accepted friends of the user
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
