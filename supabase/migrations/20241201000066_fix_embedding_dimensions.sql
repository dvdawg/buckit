create or replace function public.item_geog(i public.items) returns geography
language sql immutable as $$
  select i.location_point
$$;

create or replace function public.get_recommendation_candidates(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision,
  p_limit integer default 300
)
returns table (
  id uuid,
  embedding vector(384),
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
      and i.visibility = 'public'
  ),
  ann as (
    select g.*,
           g.embedding as emb_use
    from geo g
    where g.embedding is not null
    order by
      g.embedding <-> (select emb from uv)
    nulls last
    limit p_limit
  ),
  pop as (
    select id, 0 as completes, null as last_completion_at
    from (select distinct id from geo) g
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
           0 as friend_saves,
           0 as friend_likes
    from ann a
    left join public.completions c on c.item_id = a.id
    left join friends fr1 on fr1.fid = c.user_id
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
         0.0 as appeal_score,
         coalesce(c.collab_hint, false) as collab_hint
  from ann a
  left join pop p on p.id = a.id
  left join social s on s.id = a.id
  left join collab c on c.id = a.id;
$$;
