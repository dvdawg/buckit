-- Add appeal score column to items table
alter table public.items add column if not exists appeal_score real;

-- Create index for appeal score queries
create index if not exists idx_items_appeal_score on public.items(appeal_score) where appeal_score is not null;

-- Function to compute appeal score from events
create or replace function public.compute_appeal_score(p_item_id uuid)
returns real
language plpgsql
as $$
declare
  positive_events bigint;
  negative_events bigint;
  total_events bigint;
  appeal_score real;
begin
  -- Count positive events (complete, save, like) with time decay
  select coalesce(sum(
    case 
      when event_type in ('complete', 'save', 'like') then 
        strength * exp(-extract(epoch from (now() - created_at)) / (30*24*3600) * ln(2))
      else 0
    end
  ), 0)
  into positive_events
  from public.events
  where item_id = p_item_id;

  -- Count negative events (hide, skip) with time decay
  select coalesce(sum(
    case 
      when event_type in ('hide', 'skip') then 
        abs(strength) * exp(-extract(epoch from (now() - created_at)) / (30*24*3600) * ln(2))
      else 0
    end
  ), 0)
  into negative_events
  from public.events
  where item_id = p_item_id;

  total_events := positive_events + negative_events;
  
  if total_events = 0 then
    return null; -- No data to compute appeal
  end if;
  
  -- Compute appeal score: positive / total, normalized to [0, 1]
  appeal_score := positive_events::real / total_events::real;
  
  return appeal_score;
end;
$$;

-- Function to batch update appeal scores
create or replace function public.update_appeal_scores()
returns integer
language plpgsql
as $$
declare
  updated_count integer := 0;
  item_record record;
begin
  for item_record in 
    select id from public.items 
    where appeal_score is null or appeal_score = 0
  loop
    update public.items 
    set appeal_score = public.compute_appeal_score(item_record.id)
    where id = item_record.id;
    
    updated_count := updated_count + 1;
  end loop;
  
  return updated_count;
end;
$$;
