-- LinUCB bandit persistence tables
create table if not exists public.recs_bandit_arms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  a_matrix double precision[], -- A matrix (flattened)
  b_vector double precision[], -- b vector
  alpha real not null default 1.0, -- confidence parameter
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, item_id)
);

create index if not exists recs_bandit_arms_user_idx on public.recs_bandit_arms(user_id, last_updated desc);
create index if not exists recs_bandit_arms_item_idx on public.recs_bandit_arms(item_id);

-- RLS for bandit arms
alter table public.recs_bandit_arms enable row level security;

create policy recs_bandit_arms_owner_rw on public.recs_bandit_arms
for all
using (auth.uid() = (select u.auth_id from public.users u where u.id = user_id))
with check (auth.uid() = (select u.auth_id from public.users u where u.id = user_id));

-- Function to get or create bandit arm
create or replace function public.get_or_create_bandit_arm(
  p_user_id uuid,
  p_item_id uuid,
  p_feature_dim integer default 6 -- appeal, trait, state, social, cost, poprec
)
returns table (
  a_matrix double precision[],
  b_vector double precision[],
  alpha real
)
language plpgsql
as $$
declare
  arm_record record;
  dim integer := p_feature_dim;
  a_matrix double precision[];
  b_vector double precision[];
begin
  -- Try to get existing arm
  select a_matrix, b_vector, alpha
  into arm_record
  from public.recs_bandit_arms
  where user_id = p_user_id and item_id = p_item_id;
  
  if found then
    return query select arm_record.a_matrix, arm_record.b_vector, arm_record.alpha;
  else
    -- Create new arm with identity matrix and zero vector
    a_matrix := array_fill(1.0, ARRAY[dim * dim]); -- Identity matrix flattened
    b_vector := array_fill(0.0, ARRAY[dim]);
    
    insert into public.recs_bandit_arms (user_id, item_id, a_matrix, b_vector, alpha)
    values (p_user_id, p_item_id, a_matrix, b_vector, 1.0);
    
    return query select a_matrix, b_vector, 1.0::real;
  end if;
end;
$$;

-- Function to update bandit arm with reward
create or replace function public.update_bandit_arm(
  p_user_id uuid,
  p_item_id uuid,
  p_features double precision[],
  p_reward real,
  p_alpha real default 1.0
)
returns void
language plpgsql
as $$
declare
  dim integer;
  a_matrix double precision[];
  b_vector double precision[];
  new_a_matrix double precision[];
  new_b_vector double precision[];
  i integer;
  j integer;
begin
  dim := array_length(p_features, 1);
  
  -- Get current arm state
  select a_matrix, b_vector
  into a_matrix, b_vector
  from public.recs_bandit_arms
  where user_id = p_user_id and item_id = p_item_id;
  
  if not found then
    -- Create new arm
    a_matrix := array_fill(1.0, ARRAY[dim * dim]);
    b_vector := array_fill(0.0, ARRAY[dim]);
    
    insert into public.recs_bandit_arms (user_id, item_id, a_matrix, b_vector, alpha)
    values (p_user_id, p_item_id, a_matrix, b_vector, p_alpha);
    return;
  end if;
  
  -- Update A matrix: A = A + x * x^T
  new_a_matrix := a_matrix;
  for i in 1..dim loop
    for j in 1..dim loop
      new_a_matrix[(i-1) * dim + j] := a_matrix[(i-1) * dim + j] + p_features[i] * p_features[j];
    end loop;
  end loop;
  
  -- Update b vector: b = b + reward * x
  new_b_vector := b_vector;
  for i in 1..dim loop
    new_b_vector[i] := b_vector[i] + p_reward * p_features[i];
  end loop;
  
  -- Update the record
  update public.recs_bandit_arms
  set a_matrix = new_a_matrix,
      b_vector = new_b_vector,
      alpha = p_alpha,
      last_updated = now()
  where user_id = p_user_id and item_id = p_item_id;
end;
$$;

-- Function to compute UCB score
create or replace function public.compute_ucb_score(
  p_user_id uuid,
  p_item_id uuid,
  p_features double precision[]
)
returns real
language plpgsql
as $$
declare
  arm_record record;
  dim integer;
  a_matrix double precision[];
  b_vector double precision[];
  alpha real;
  ucb_score real;
  i integer;
  j integer;
  confidence real;
begin
  dim := array_length(p_features, 1);
  
  -- Get arm state
  select a_matrix, b_vector, alpha
  into arm_record
  from public.recs_bandit_arms
  where user_id = p_user_id and item_id = p_item_id;
  
  if not found then
    -- New arm, return high confidence
    return 1.0;
  end if;
  
  a_matrix := arm_record.a_matrix;
  b_vector := arm_record.b_vector;
  alpha := arm_record.alpha;
  
  -- Simple UCB computation (assuming diagonal A matrix for simplicity)
  -- In practice, you'd want to solve A * theta = b for theta
  -- For now, use a simplified approach
  ucb_score := 0.0;
  confidence := 0.0;
  
  for i in 1..dim loop
    if a_matrix[(i-1) * dim + i] > 0 then
      ucb_score := ucb_score + (b_vector[i] / a_matrix[(i-1) * dim + i]) * p_features[i];
      confidence := confidence + alpha * sqrt(log(1 + a_matrix[(i-1) * dim + i])) * abs(p_features[i]);
    end if;
  end loop;
  
  return ucb_score + confidence;
end;
$$;
