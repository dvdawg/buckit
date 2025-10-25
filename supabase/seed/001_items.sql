insert into buckets(id, user_id, name) values
  ('b_demo', '00000000-0000-0000-0000-000000000001', 'Outdoors');

insert into items(id, user_id, title, desc, location, lat, lng, tags, cost, ease_level, bucket_id)
values
  ('i_ggb', '00000000-0000-0000-0000-000000000002',
   'Walk the Golden Gate Bridge','Scenic walk', 'San Francisco, CA',
   37.8199,-122.4783, '{outdoors,free}', 0, 2, 'b_demo'),
  ('i_sfmoma','00000000-0000-0000-0000-000000000003',
   'SFMOMA First Thursday','Free museum night','San Francisco, CA',
   37.7857,-122.4011,'{art,free,indoors}', 0, 1,'b_demo');
