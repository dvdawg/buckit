create extension if not exists vector;

do $$
begin
  if not exists (
    select 1 from pg_indexes 
    where tablename = 'items' 
    and indexname = 'idx_items_embedding'
  ) then
    create index if not exists idx_items_embedding 
      on public.items using ivfflat (embedding vector_cosine_ops) with (lists=100);
  end if;
end $$;
