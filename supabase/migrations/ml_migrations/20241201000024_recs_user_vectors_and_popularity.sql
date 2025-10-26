drop materialized view if exists public.user_vectors cascade;
create materialized view public.user_vectors as
with signals as (
  select e.user_id, e.item_id as i2, e.strength, e.created_at
  from public.events e
  where e.event_type in ('view','like','save','start','complete')
  union all
  select c.user_id, c.item_id as i2, 3.0 as strength, c.created_at
  from public.completions c
)
, joined as (
  select s.user_id, 
         it.embedding::vector(1536) as embedding,
         s.strength, s.created_at
  from signals s
  join public.items it on it.id = s.i2
  where it.embedding is not null
)
, decayed as (
  select user_id,
         embedding as emb,
         strength * exp( - greatest(0, extract(epoch from (now() - created_at))) / (30*24*3600) * ln(2) ) as w
  from joined
)
select 
  user_id,
  case 
    when count(*) = 0 then null
    else (
      select avg(emb) 
      from (
        select emb 
        from decayed d2 
        where d2.user_id = decayed.user_id
        order by w desc
        limit 50
      ) top_items
    )
  end as emb
from decayed
group by user_id;

create unique index if not exists user_vectors_user_idx on public.user_vectors(user_id);

drop materialized view if exists public.item_popularity cascade;
create materialized view public.item_popularity as
select i.id,
       coalesce(count(c.id),0) as completes,
       max(c.created_at) as last_completion_at
from public.items i
left join public.completions c on c.item_id = i.id
group by i.id;

create unique index if not exists item_popularity_id_idx on public.item_popularity(id);

create or replace function public.refresh_recs_materialized()
returns void language plpgsql as $$
begin
  refresh materialized view concurrently public.user_vectors;
  refresh materialized view concurrently public.item_popularity;
end $$;
