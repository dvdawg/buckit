-- Fix embedding dimension to standardize on EMBED_DIM
-- Check if items.embedding is the correct dimension, if not create embedding_vec

do $$
declare
  coltype text;
  embed_dim integer := 1536; -- Default to OpenAI embedding dimension
begin
  -- Get the current embedding column type
  select atttypid::regtype::text
  into coltype
  from pg_attribute
  where attrelid = 'public.items'::regclass and attname = 'embedding' and attnum > 0;

  -- If embedding column doesn't match expected dimension, create embedding_vec
  if coltype is null or coltype not like 'vector(' || embed_dim || ')' then
    -- Create the new vector column with correct dimension
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name='items' and column_name='embedding_vec'
    ) then
      alter table public.items add column embedding_vec vector(1536);
      
      -- Copy existing embeddings if they exist and are compatible
      if coltype like 'vector(%' then
        -- Try to copy existing embeddings (this might fail if dimensions don't match)
        begin
          update public.items 
          set embedding_vec = embedding::vector(1536) 
          where embedding is not null;
        exception when others then
          -- If copy fails, leave embedding_vec as null for now
          raise notice 'Could not copy existing embeddings due to dimension mismatch';
        end;
      end if;
    end if;
  end if;
end $$;

-- Create ANN index on the active vector column
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='items' and column_name='embedding_vec') then
    -- Use embedding_vec if it exists
    create index if not exists items_embedding_vec_ivfflat_idx
      on public.items using ivfflat (embedding_vec vector_cosine_ops) with (lists=100);
  else
    -- Use embedding if it's the right dimension
    create index if not exists items_embedding_ivfflat_idx
      on public.items using ivfflat (embedding vector_cosine_ops) with (lists=100);
  end if;
end $$;

-- Update the candidate RPC to use the correct column
DROP FUNCTION IF EXISTS public.get_recommendation_candidates(uuid, double precision, double precision, double precision, integer);
create or replace function public.get_recommendation_candidates(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision,
  p_limit integer default 300
)
returns table (
  id uuid,
  embedding vector(1536),  -- Always return 1536 dimensions
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
           g.embedding::vector(1536) as emb_use
    from geo g
    where g.embedding is not null
    order by
      (g.embedding::vector(1536) <-> (select emb from uv))
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
         0.0 as appeal_score,                                                                
         coalesce(c.collab_hint, false) as collab_hint
  from ann a
  left join pop p on p.id = a.id
  left join social s on s.id = a.id
  left join collab c on c.id = a.id;
$$;
