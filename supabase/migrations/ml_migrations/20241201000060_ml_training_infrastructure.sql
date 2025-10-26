-- ML Training Infrastructure
-- Tables for managing model training jobs and deployments

-- Training jobs table
create table if not exists public.ml_training_jobs (
  id uuid primary key default gen_random_uuid(),
  model_type text not null check (model_type in ('appeal_head', 'user_vectors', 'embeddings')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metrics jsonb default '{}',
  model_version text,
  created_by uuid references public.users(id) on delete set null
);

create index if not exists ml_training_jobs_status_idx on public.ml_training_jobs(status, created_at desc);
create index if not exists ml_training_jobs_model_type_idx on public.ml_training_jobs(model_type, created_at desc);

-- Model versions table
create table if not exists public.ml_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_type text not null check (model_type in ('appeal_head', 'user_vectors', 'embeddings')),
  version text not null,
  is_active boolean not null default false,
  model_path text, -- Path to stored model file
  model_size_bytes bigint,
  training_job_id uuid references public.ml_training_jobs(id) on delete set null,
  metrics jsonb default '{}',
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(model_type, version)
);

create index if not exists ml_model_versions_active_idx on public.ml_model_versions(model_type, is_active);
create index if not exists ml_model_versions_deployed_idx on public.ml_model_versions(deployed_at desc);

-- Model storage table for binary data
create table if not exists public.ml_model_storage (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.ml_model_versions(id) on delete cascade,
  file_type text not null check (file_type in ('onnx', 'pkl', 'json', 'weights')),
  file_data bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists ml_model_storage_version_idx on public.ml_model_storage(model_version_id);

-- Training schedules table
create table if not exists public.ml_training_schedules (
  id uuid primary key default gen_random_uuid(),
  model_type text not null check (model_type in ('appeal_head', 'user_vectors', 'embeddings')),
  cron_expression text not null,
  is_enabled boolean not null default true,
  last_run timestamptz,
  next_run timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ml_training_schedules_enabled_idx on public.ml_training_schedules(is_enabled, next_run);

-- RLS policies
alter table public.ml_training_jobs enable row level security;
alter table public.ml_model_versions enable row level security;
alter table public.ml_model_storage enable row level security;
alter table public.ml_training_schedules enable row level security;

-- Allow service role full access
create policy ml_training_jobs_service_rw on public.ml_training_jobs
for all using (true) with check (true);

create policy ml_model_versions_service_rw on public.ml_model_versions
for all using (true) with check (true);

create policy ml_model_storage_service_rw on public.ml_model_storage
for all using (true) with check (true);

create policy ml_training_schedules_service_rw on public.ml_training_schedules
for all using (true) with check (true);

-- Allow authenticated users to read training jobs and model versions
create policy ml_training_jobs_read on public.ml_training_jobs
for select using (true);

create policy ml_model_versions_read on public.ml_model_versions
for select using (true);

-- Function to get active model version
create or replace function public.get_active_model_version(p_model_type text)
returns text
language plpgsql
as $$
declare
  active_version text;
begin
  select version
  into active_version
  from public.ml_model_versions
  where model_type = p_model_type
    and is_active = true
  order by deployed_at desc
  limit 1;
  
  return coalesce(active_version, 'default');
end;
$$;

-- Function to create training job
create or replace function public.create_training_job(
  p_model_type text,
  p_created_by uuid default null
)
returns uuid
language plpgsql
as $$
declare
  job_id uuid;
begin
  insert into public.ml_training_jobs (model_type, created_by)
  values (p_model_type, p_created_by)
  returning id into job_id;
  
  return job_id;
end;
$$;

-- Function to update training job status
create or replace function public.update_training_job_status(
  p_job_id uuid,
  p_status text,
  p_metrics jsonb default null,
  p_model_version text default null,
  p_error_message text default null
)
returns void
language plpgsql
as $$
begin
  update public.ml_training_jobs
  set 
    status = p_status,
    completed_at = case when p_status in ('completed', 'failed') then now() else completed_at end,
    started_at = case when p_status = 'running' and started_at is null then now() else started_at end,
    metrics = coalesce(p_metrics, metrics),
    model_version = coalesce(p_model_version, model_version),
    error_message = coalesce(p_error_message, error_message)
  where id = p_job_id;
end;
$$;

-- Function to deploy model version
create or replace function public.deploy_model_version(
  p_model_type text,
  p_version text
)
returns void
language plpgsql
as $$
begin
  -- Deactivate all other versions of this model type
  update public.ml_model_versions
  set is_active = false
  where model_type = p_model_type;
  
  -- Activate the specified version
  update public.ml_model_versions
  set 
    is_active = true,
    deployed_at = now()
  where model_type = p_model_type
    and version = p_version;
end;
$$;

-- Function to get next scheduled training jobs
create or replace function public.get_next_training_jobs()
returns table (
  id uuid,
  model_type text,
  cron_expression text
)
language plpgsql
as $$
begin
  return query
  select 
    s.id,
    s.model_type,
    s.cron_expression
  from public.ml_training_schedules s
  where s.is_enabled = true
    and (s.next_run is null or s.next_run <= now());
end;
$$;

-- Insert default training schedules
insert into public.ml_training_schedules (model_type, cron_expression, is_enabled) values
('appeal_head', '0 2 * * *', true),  -- Daily at 2 AM
('user_vectors', '0 */6 * * *', true),  -- Every 6 hours
('embeddings', '0 1 * * *', true);  -- Daily at 1 AM

-- Create view for training job summary
create or replace view public.ml_training_summary as
select 
  model_type,
  count(*) as total_jobs,
  count(case when status = 'completed' then 1 end) as completed_jobs,
  count(case when status = 'failed' then 1 end) as failed_jobs,
  count(case when status = 'running' then 1 end) as running_jobs,
  max(created_at) as last_job_created,
  max(case when status = 'completed' then completed_at end) as last_successful_job
from public.ml_training_jobs
group by model_type;
