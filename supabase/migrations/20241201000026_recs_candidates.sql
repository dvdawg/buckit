-- RPC: candidates by user trait ANN + geo + visibility + social
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
  friend_completes bigint
) language sql stable as $$
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
           g.embedding as emb_use
    from geo g
    where g.embedding is not null
    order by
      g.embedding <-> (select emb from uv)
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
           count(c.id) as friend_completes
    from ann a
    join public.completions c on c.item_id = a.id
    join friends fr on fr.fid = c.user_id
    group by a.id
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
         coalesce(s.friend_completes,0) as friend_completes
  from ann a
  left join pop p on p.id = a.id
  left join social s on s.id = a.id;
$$;
