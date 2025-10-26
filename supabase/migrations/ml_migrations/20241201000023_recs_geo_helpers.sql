
create or replace function public.item_geog(i public.items) returns geography
language sql immutable as $$
  select i.location_point
$$;
