
DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view public items" ON items;

DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
CREATE POLICY "Users can view their own buckets" ON buckets
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view friend's buckets" ON buckets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                   OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
            AND status = 'accepted'
            AND (owner_id = user_id OR owner_id = friend_id)
        )
    );

DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;
CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view friend's items" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                   OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
            AND status = 'accepted'
            AND (owner_id = user_id OR owner_id = friend_id)
        )
    );

DROP POLICY IF EXISTS "Users can view relevant feed events" ON feed_events;

CREATE POLICY "Users can view relevant feed events" ON feed_events
    FOR SELECT USING (
        actor_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR (audience = 'friends' AND EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                   OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
            AND status = 'accepted'
            AND (actor_id = user_id OR actor_id = friend_id)
        ))
    );

CREATE OR REPLACE FUNCTION search_users(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    handle TEXT,
    full_name TEXT,
    avatar_url TEXT,
    points INTEGER,
    is_friend BOOLEAN,
    friendship_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        u.id,
        u.handle,
        u.full_name,
        u.avatar_url,
        u.points,
        CASE 
            WHEN f.status = 'accepted' THEN TRUE
            ELSE FALSE
        END as is_friend,
        COALESCE(f.status, 'none') as friendship_status
    FROM users u
    LEFT JOIN friendships f ON (
        (f.user_id = me_user_id() AND f.friend_id = u.id)
        OR (f.user_id = u.id AND f.friend_id = me_user_id())
    )
    WHERE u.id != me_user_id()
    AND (
        u.handle ILIKE '%' || search_term || '%'
        OR u.full_name ILIKE '%' || search_term || '%'
    )
    ORDER BY 
        CASE WHEN f.status = 'accepted' THEN 1 ELSE 2 END,
        u.points DESC
    LIMIT limit_count;
$$;

CREATE OR REPLACE FUNCTION get_user_by_handle(p_handle TEXT)
RETURNS TABLE (
    id UUID,
    handle TEXT,
    full_name TEXT,
    avatar_url TEXT,
    points INTEGER,
    location TEXT,
    created_at TIMESTAMPTZ,
    is_friend BOOLEAN,
    friendship_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        u.id,
        u.handle,
        u.full_name,
        u.avatar_url,
        u.points,
        u.location,
        u.created_at,
        CASE 
            WHEN f.status = 'accepted' THEN TRUE
            ELSE FALSE
        END as is_friend,
        COALESCE(f.status, 'none') as friendship_status
    FROM users u
    LEFT JOIN friendships f ON (
        (f.user_id = me_user_id() AND f.friend_id = u.id)
        OR (f.user_id = u.id AND f.friend_id = me_user_id())
    )
    WHERE u.handle = p_handle;
$$;

CREATE OR REPLACE FUNCTION get_user_buckets(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    cover_url TEXT,
    emoji TEXT,
    color TEXT,
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
        b.challenge_count,
        b.completion_percentage,
        b.created_at
    FROM buckets b
    WHERE b.owner_id = p_user_id
    AND (
        p_user_id = me_user_id()
        OR EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
        )
    )
    ORDER BY b.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_user_items(p_user_id UUID, p_bucket_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    bucket_id UUID,
    title TEXT,
    description TEXT,
    location_name TEXT,
    deadline DATE,
    tags TEXT[],
    price_min INTEGER,
    price_max INTEGER,
    difficulty INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        i.id,
        i.bucket_id,
        i.title,
        i.description,
        i.location_name,
        i.deadline,
        i.tags,
        i.price_min,
        i.price_max,
        i.difficulty,
        i.created_at
    FROM items i
    WHERE i.owner_id = p_user_id
    AND (p_bucket_id IS NULL OR i.bucket_id = p_bucket_id)
    AND (
        p_user_id = me_user_id()
        OR EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
        )
    )
    ORDER BY i.created_at DESC;
$$;
