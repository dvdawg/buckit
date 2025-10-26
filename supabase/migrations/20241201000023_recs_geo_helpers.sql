-- Geo alignment to location_point
-- location_point is already GEOGRAPHY(POINT, 4326) in the initial schema
-- Create helper function for distance queries

create or replace function public.item_geog(i public.items) returns geography
language sql immutable as $$
  -- location_point is already geography(Point,4326), so return it directly
  select i.location_point
$$;
