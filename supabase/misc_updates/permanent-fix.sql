
ALTER TABLE buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can create buckets" ON buckets;
DROP POLICY IF EXISTS "Users can update their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can delete their own buckets" ON buckets;

DROP POLICY IF EXISTS "Users can view public items" ON items;
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;
DROP POLICY IF EXISTS "Users can view items in their buckets" ON items;
DROP POLICY IF EXISTS "Users can create items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

DROP POLICY IF EXISTS "Users can view bucket collaborators" ON bucket_collaborators;
DROP POLICY IF EXISTS "Bucket owners can manage collaborators" ON bucket_collaborators;

DROP POLICY IF EXISTS "Users can view completions" ON completions;
DROP POLICY IF EXISTS "Users can create completions" ON completions;
DROP POLICY IF EXISTS "Users can update their own completions" ON completions;

DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;

DROP POLICY IF EXISTS "Users can view relevant feed events" ON feed_events;
DROP POLICY IF EXISTS "Users can create feed events" ON feed_events;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON users
    FOR ALL USING (auth.uid() = auth_id);

CREATE POLICY "buckets_owner_access" ON buckets
    FOR ALL USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "buckets_public_read" ON buckets
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "items_owner_access" ON items
    FOR ALL USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "items_public_read" ON items
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "items_bucket_owner_access" ON items
    FOR SELECT USING (
        bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "bucket_collaborators_access" ON bucket_collaborators
    FOR ALL USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "completions_access" ON completions
    FOR ALL USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR item_id IN (
            SELECT id FROM items 
            WHERE owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "friendships_access" ON friendships
    FOR ALL USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "feed_events_access" ON feed_events
    FOR ALL USING (
        actor_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR audience = 'public'
    );
