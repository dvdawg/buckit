-- Metrics views for recommendation system monitoring

-- CTR (Click-Through Rate) over 7 days
create or replace view public.recs_ctr_7d as
select 
  date_trunc('day', e.created_at) as date,
  count(case when e.event_type = 'impression' then 1 end) as impressions,
  count(case when e.event_type in ('view', 'like', 'save', 'start', 'complete') then 1 end) as clicks,
  case 
    when count(case when e.event_type = 'impression' then 1 end) > 0 
    then count(case when e.event_type in ('view', 'like', 'save', 'start', 'complete') then 1 end)::float / 
         count(case when e.event_type = 'impression' then 1 end)::float
    else 0 
  end as ctr
from public.events e
where e.created_at >= now() - interval '7 days'
  and e.event_type in ('impression', 'view', 'like', 'save', 'start', 'complete')
group by date_trunc('day', e.created_at)
order by date desc;

-- CPR (Completions Per 1k Impressions) over 7 days
create or replace view public.recs_cpr_7d as
select 
  date_trunc('day', e.created_at) as date,
  count(case when e.event_type = 'impression' then 1 end) as impressions,
  count(case when e.event_type = 'complete' then 1 end) as completions,
  case 
    when count(case when e.event_type = 'impression' then 1 end) > 0 
    then (count(case when e.event_type = 'complete' then 1 end)::float / 
          count(case when e.event_type = 'impression' then 1 end)::float) * 1000
    else 0 
  end as cpr
from public.events e
where e.created_at >= now() - interval '7 days'
  and e.event_type in ('impression', 'complete')
group by date_trunc('day', e.created_at)
order by date desc;

-- Coverage K (unique items in top-K per day)
create or replace view public.recs_coverage_k as
with daily_recommendations as (
  select 
    date_trunc('day', e.created_at) as date,
    e.item_id,
    row_number() over (partition by date_trunc('day', e.created_at), e.user_id order by e.created_at) as rank
  from public.events e
  where e.event_type = 'impression'
    and e.created_at >= now() - interval '7 days'
),
top_k_items as (
  select date, item_id
  from daily_recommendations
  where rank <= 10 -- Top 10 items per user per day
)
select 
  date,
  count(distinct item_id) as unique_items_in_top10,
  count(distinct item_id)::float / (select count(*) from public.items where visibility = 'public')::float as coverage_ratio
from top_k_items
group by date
order by date desc;

-- Diversity K (category entropy in top-K)
create or replace view public.recs_diversity_k as
with daily_recommendations as (
  select 
    date_trunc('day', e.created_at) as date,
    e.item_id,
    b.title as bucket_title,
    row_number() over (partition by date_trunc('day', e.created_at), e.user_id order by e.created_at) as rank
  from public.events e
  join public.items i on i.id = e.item_id
  join public.buckets b on b.id = i.bucket_id
  where e.event_type = 'impression'
    and e.created_at >= now() - interval '7 days'
),
top_k_buckets as (
  select date, bucket_title
  from daily_recommendations
  where rank <= 10
),
bucket_counts as (
  select 
    date,
    bucket_title,
    count(*) as bucket_count
  from top_k_buckets
  group by date, bucket_title
),
entropy_calc as (
  select 
    bucket_counts.date,
    sum(bucket_counts.bucket_count) as total_items,
    -sum((bucket_counts.bucket_count::float / totals.total_count) * ln(bucket_counts.bucket_count::float / totals.total_count)) as entropy
  from bucket_counts
  join (
    select date, sum(bucket_count) as total_count
    from bucket_counts
    group by date
  ) totals on totals.date = bucket_counts.date
  group by bucket_counts.date
)
select 
  entropy_calc.date,
  entropy_calc.total_items,
  entropy_calc.entropy,
  entropy_calc.entropy / ln(greatest((select count(distinct bucket_title) from bucket_counts where bucket_counts.date = entropy_calc.date), 1)) as normalized_entropy
from entropy_calc
group by date, total_items, entropy
order by date desc;

-- Performance metrics (latency tracking)
create table if not exists public.recs_performance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  function_name text not null,
  duration_ms integer not null,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists recs_performance_logs_created_idx on public.recs_performance_logs(created_at desc);
create index if not exists recs_performance_logs_function_idx on public.recs_performance_logs(function_name, created_at desc);

-- RLS for performance logs
alter table public.recs_performance_logs enable row level security;

create policy recs_performance_logs_owner_rw on public.recs_performance_logs
for all
using (auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
with check (auth.uid() = (select u.auth_id from public.users u where u.id = user_id));

-- P95 latency view
create or replace view public.recs_latency_p95 as
select 
  function_name,
  date_trunc('hour', created_at) as hour,
  count(*) as request_count,
  percentile_cont(0.50) within group (order by duration_ms) as p50_latency_ms,
  percentile_cont(0.95) within group (order by duration_ms) as p95_latency_ms,
  percentile_cont(0.99) within group (order by duration_ms) as p99_latency_ms,
  avg(duration_ms) as avg_latency_ms,
  sum(case when success then 1 else 0 end)::float / count(*) as success_rate
from public.recs_performance_logs
where created_at >= now() - interval '24 hours'
group by function_name, date_trunc('hour', created_at)
order by hour desc, function_name;

-- Function to log performance metrics
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
  insert into public.recs_performance_logs (
    user_id, function_name, duration_ms, success, error_message
  ) values (
    p_user_id, p_function_name, p_duration_ms, p_success, p_error_message
  );
end;
$$;

-- Overall metrics summary
create or replace view public.recs_metrics_summary as
select 
  'ctr_7d' as metric_name,
  avg(ctr) as avg_value,
  min(ctr) as min_value,
  max(ctr) as max_value,
  stddev(ctr) as stddev_value
from public.recs_ctr_7d
where date >= now() - interval '7 days'

union all

select 
  'cpr_7d' as metric_name,
  avg(cpr) as avg_value,
  min(cpr) as min_value,
  max(cpr) as max_value,
  stddev(cpr) as stddev_value
from public.recs_cpr_7d
where date >= now() - interval '7 days'

union all

select 
  'coverage_k' as metric_name,
  avg(coverage_ratio) as avg_value,
  min(coverage_ratio) as min_value,
  max(coverage_ratio) as max_value,
  stddev(coverage_ratio) as stddev_value
from public.recs_coverage_k
where date >= now() - interval '7 days'

union all

select 
  'diversity_k' as metric_name,
  avg(normalized_entropy) as avg_value,
  min(normalized_entropy) as min_value,
  max(normalized_entropy) as max_value,
  stddev(normalized_entropy) as stddev_value
from public.recs_diversity_k
where date >= now() - interval '7 days'

union all

select 
  'p95_latency_ms' as metric_name,
  avg(p95_latency_ms) as avg_value,
  min(p95_latency_ms) as min_value,
  max(p95_latency_ms) as max_value,
  stddev(p95_latency_ms) as stddev_value
from public.recs_latency_p95
where hour >= now() - interval '24 hours';
