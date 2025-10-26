-- Update policies to support bucket-level privacy
-- Buckets can be private (only owner), friends (visible to friends), or public
-- Remove the "all accounts are private" restriction

-- Update buckets policies to support different visibility levels
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;

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

CREATE POLICY "Users can view public buckets" ON buckets
    FOR SELECT USING (visibility = 'public');

-- Update items policies to respect bucket visibility
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;

CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view items in visible buckets" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM buckets b
            WHERE b.id = items.bucket_id 
            AND (
                -- Owner can see all their items
                b.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                -- Or bucket is public
                OR b.visibility = 'public'
                -- Or bucket is friends and user is friends with owner
                OR (b.visibility = 'friends' AND EXISTS (
                    SELECT 1 FROM friendships f
                    WHERE (f.user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                           OR f.friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
                    AND f.status = 'accepted'
                    AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
                ))
            )
        )
    );

-- Update feed events to support different visibility levels
DROP POLICY IF EXISTS "Users can view relevant feed events" ON feed_events;

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

-- Update get_user_buckets function to respect bucket visibility
CREATE OR REPLACE FUNCTION get_user_buckets(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    cover_url TEXT,
    emoji TEXT,
    color TEXT,
    visibility TEXT,
    challenge_count INTEGER,
    completion_percentage INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        b.id,
        b.title,
        b.description,
        b.cover_url,
        b.emoji,
        b.color,
        b.visibility,
        b.challenge_count,
        b.completion_percentage,
        b.created_at
    FROM buckets b
    WHERE b.owner_id = p_user_id
    AND (
        -- User can see their own buckets
        p_user_id = me_user_id()
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is friends and user is friends with the bucket owner
        OR (b.visibility = 'friends' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
        ))
    )
    ORDER BY b.created_at DESC;
$$;

-- Add function to get bucket visibility options
CREATE OR REPLACE FUNCTION get_bucket_visibility_options()
RETURNS TABLE (
    value TEXT,
    label TEXT,
    description TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 'private'::TEXT as value, 'Private'::TEXT as label, 'Only you can see this bucket'::TEXT as description
    UNION ALL
    SELECT 'friends'::TEXT as value, 'Friends'::TEXT as label, 'Your friends can see this bucket'::TEXT as description
    UNION ALL
    SELECT 'public'::TEXT as value, 'Public'::TEXT as label, 'Everyone can see this bucket'::TEXT as description;
$$;
