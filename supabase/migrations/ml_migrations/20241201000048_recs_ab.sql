
create table if not exists public.recs_experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  params jsonb not null default '{}',
  enabled boolean not null default false,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recs_experiments_enabled_idx on public.recs_experiments(enabled, start_date, end_date);

create table if not exists public.recs_experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  experiment_id uuid not null references public.recs_experiments(id) on delete cascade,
  variant text not null,
  assigned_at timestamptz not null default now(),
  unique(user_id, experiment_id)
);

create index if not exists recs_experiment_assignments_user_idx on public.recs_experiment_assignments(user_id);
create index if not exists recs_experiment_assignments_experiment_idx on public.recs_experiment_assignments(experiment_id, variant);

alter table public.recs_experiments enable row level security;
alter table public.recs_experiment_assignments enable row level security;

create policy recs_experiments_read on public.recs_experiments
for select
using (true);

create policy recs_experiment_assignments_owner_rw on public.recs_experiment_assignments
for all
using (auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
with check (auth.uid() = (select u.auth_id from public.users u where u.id = user_id));

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
as $$
begin
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

create or replace function public.assign_user_to_experiment(
  p_user_id uuid,
  p_experiment_name text,
  p_variant text default null
)
returns text
language plpgsql
as $$
declare
  experiment_record record;
  assigned_variant text;
  variants text[];
  random_variant text;
begin
  select id, params
  into experiment_record
  from public.recs_experiments
  where name = p_experiment_name
    and enabled = true
    and (start_date is null or start_date <= now())
    and (end_date is null or end_date >= now());
  
  if not found then
    return 'control';
  end if;
  
  select variant
  into assigned_variant
  from public.recs_experiment_assignments
  where user_id = p_user_id and experiment_id = experiment_record.id;
  
  if found then
    return assigned_variant;
  end if;
  
  if p_variant is not null then
    assigned_variant := p_variant;
  else
    variants := coalesce(
      (experiment_record.params->>'variants')::text[],
      ARRAY['control', 'treatment']
    );
    
    random_variant := variants[1 + floor(random() * array_length(variants, 1))];
    assigned_variant := random_variant;
  end if;
  
  insert into public.recs_experiment_assignments (user_id, experiment_id, variant)
  values (p_user_id, experiment_record.id, assigned_variant)
  on conflict (user_id, experiment_id) do nothing;
  
  return assigned_variant;
end;
$$;

create or replace function public.get_experiment_params(
  p_user_id uuid,
  p_experiment_name text
)
returns jsonb
language plpgsql
as $$
declare
  experiment_params jsonb;
  variant_params jsonb;
  result_params jsonb;
begin
  select params
  into experiment_params
  from public.recs_experiments
  where name = p_experiment_name
    and enabled = true
    and (start_date is null or start_date <= now())
    and (end_date is null or end_date >= now());
  
  if not found then
    return '{}'::jsonb;
  end if;
  
  select variant
  into variant_params
  from public.recs_experiment_assignments ea
  join public.recs_experiments e on e.id = ea.experiment_id
  where ea.user_id = p_user_id
    and e.name = p_experiment_name;
  
  result_params := experiment_params;
  
  if variant_params is not null then
    result_params := result_params || jsonb_build_object('variant', variant_params);
    
    if experiment_params ? 'variants' and experiment_params->'variants' ? variant_params::text then
      result_params := result_params || (experiment_params->'variants'->variant_params::text);
    end if;
  end if;
  
  return result_params;
end;
$$;

insert into public.recs_experiments (name, description, params, enabled) values
(
  'social_weight_test',
  'Test different social signal weights',
  '{
    "variants": {
      "control": {"social_weight": 0.15},
      "treatment": {"social_weight": 0.25}
    },
    "default_params": {
      "appeal_weight": 0.25,
      "trait_weight": 0.25,
      "state_weight": 0.20,
      "cost_weight": 0.25
    }
  }',
  true
),
(
  'mmr_lambda_test',
  'Test different MMR diversity parameters',
  '{
    "variants": {
      "control": {"mmr_lambda": 0.6},
      "treatment": {"mmr_lambda": 0.8}
    },
    "default_params": {
      "explore_slots": 2
    }
  }',
  true
),
(
  'explore_slots_test',
  'Test different exploration slot counts',
  '{
    "variants": {
      "control": {"explore_slots": 1},
      "treatment": {"explore_slots": 3}
    },
    "default_params": {
      "mmr_lambda": 0.7
    }
  }',
  false
)
on conflict (name) do nothing;
