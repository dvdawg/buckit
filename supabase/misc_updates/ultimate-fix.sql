
ALTER TABLE buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON users;
DROP POLICY IF EXISTS "buckets_owner_access" ON buckets;
DROP POLICY IF EXISTS "buckets_public_read" ON buckets;
DROP POLICY IF EXISTS "items_owner_access" ON items;
DROP POLICY IF EXISTS "items_public_read" ON items;
DROP POLICY IF EXISTS "items_bucket_owner_access" ON items;
DROP POLICY IF EXISTS "bucket_collaborators_access" ON bucket_collaborators;
DROP POLICY IF EXISTS "completions_access" ON completions;
DROP POLICY IF EXISTS "friendships_access" ON friendships;
DROP POLICY IF EXISTS "feed_events_access" ON feed_events;

ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_buckets" ON buckets
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_items" ON items
    FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profile" ON users
    FOR ALL USING (auth.uid() = auth_id);

ALTER TABLE bucket_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_collaborators" ON bucket_collaborators
    FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_completions" ON completions
    FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_friendships" ON friendships
    FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_feed_events" ON feed_events
    FOR ALL USING (auth.uid() IS NOT NULL);
