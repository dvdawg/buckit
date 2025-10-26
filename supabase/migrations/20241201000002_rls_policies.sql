ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can view public buckets" ON buckets
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view their own buckets" ON buckets
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view friend's buckets" ON buckets
    FOR SELECT USING (
        visibility = 'friends' AND 
        EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                   OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
            AND status = 'accepted'
            AND (owner_id = user_id OR owner_id = friend_id)
        )
    );

CREATE POLICY "Users can create buckets" ON buckets
    FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can update their own buckets" ON buckets
    FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can delete their own buckets" ON buckets
    FOR DELETE USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view public items" ON items
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view friend's items" ON items
    FOR SELECT USING (
        visibility = 'friends' AND 
        EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                   OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
            AND status = 'accepted'
            AND (owner_id = user_id OR owner_id = friend_id)
        )
    );

CREATE POLICY "Users can view items in their buckets" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM buckets 
            WHERE buckets.id = items.bucket_id 
            AND (buckets.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                 OR EXISTS (
                     SELECT 1 FROM bucket_collaborators 
                     WHERE bucket_collaborators.bucket_id = buckets.id 
                     AND bucket_collaborators.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                 ))
        )
    );

CREATE POLICY "Users can create items" ON items
    FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can update their own items" ON items
    FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can delete their own items" ON items
    FOR DELETE USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view bucket collaborators" ON bucket_collaborators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM buckets 
            WHERE buckets.id = bucket_collaborators.bucket_id 
            AND (buckets.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                 OR user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
        )
    );

CREATE POLICY "Bucket owners can manage collaborators" ON bucket_collaborators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM buckets 
            WHERE buckets.id = bucket_collaborators.bucket_id 
            AND buckets.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "Users can view completions" ON completions
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM items 
            WHERE items.id = completions.item_id 
            AND items.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "Users can create completions" ON completions
    FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their own completions" ON completions
    FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Users can view their friendships" ON friendships
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "Users can create friendships" ON friendships
    FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their friendships" ON friendships
    FOR UPDATE USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "Users can view relevant feed events" ON feed_events
    FOR SELECT USING (
        actor_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR audience = 'public'
        OR (audience = 'friends' AND EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                   OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
            AND status = 'accepted'
            AND (actor_id = user_id OR actor_id = friend_id)
        ))
    );

CREATE POLICY "Users can create feed events" ON feed_events
    FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = actor_id));
