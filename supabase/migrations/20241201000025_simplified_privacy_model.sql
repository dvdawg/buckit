
ALTER TABLE buckets DROP CONSTRAINT IF EXISTS buckets_visibility_check;
ALTER TABLE buckets ADD CONSTRAINT buckets_visibility_check 
    CHECK (visibility IN ('manual', 'friends'));

ALTER TABLE buckets ALTER COLUMN visibility SET DEFAULT 'manual';

UPDATE buckets SET visibility = 'manual' WHERE visibility = 'private';

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_visibility_check;
ALTER TABLE items ADD CONSTRAINT items_visibility_check 
    CHECK (visibility IN ('manual', 'friends'));

ALTER TABLE items ALTER COLUMN visibility SET DEFAULT 'manual';

UPDATE items SET visibility = 'manual' WHERE visibility = 'private';

DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;

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

CREATE POLICY "Users can view manually shared buckets" ON buckets
    FOR SELECT USING (
        visibility = 'manual' AND 
        EXISTS (
            SELECT 1 FROM bucket_collaborators 
            WHERE bucket_collaborators.bucket_id = buckets.id 
            AND bucket_collaborators.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view items in visible buckets" ON items;

CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

CREATE POLICY "Users can view items in visible buckets" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM buckets b
            WHERE b.id = items.bucket_id 
            AND (
                b.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                OR (b.visibility = 'friends' AND EXISTS (
                    SELECT 1 FROM friendships f
                    WHERE (f.user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                           OR f.friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
                    AND f.status = 'accepted'
                    AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
                ))
                OR (b.visibility = 'manual' AND EXISTS (
                    SELECT 1 FROM bucket_collaborators bc
                    WHERE bc.bucket_id = b.id 
                    AND bc.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                ))
            )
        )
    );

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
        p_user_id = me_user_id()
        OR (b.visibility = 'friends' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
        ))
        OR (b.visibility = 'manual' AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id 
            AND bc.user_id = me_user_id()
        ))
    )
    ORDER BY b.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_bucket_visibility_options()
RETURNS TABLE (
    value TEXT,
    label TEXT,
    description TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 'manual'::TEXT as value, 'Manual Setting'::TEXT as label, 'Only you and invited friends'::TEXT as description
    UNION ALL
    SELECT 'friends'::TEXT as value, 'Friends'::TEXT as label, 'Anyone you are friends with'::TEXT as description;
$$;

CREATE OR REPLACE FUNCTION create_bucket_secure(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_visibility TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_id UUID;
    user_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF p_visibility NOT IN ('manual', 'friends') THEN
        RAISE EXCEPTION 'Invalid visibility option. Must be "manual" or "friends"';
    END IF;
    
    INSERT INTO buckets (owner_id, title, description, visibility)
    VALUES (user_id, p_title, p_description, p_visibility)
    RETURNING id INTO bucket_id;
    
    INSERT INTO feed_events (actor_id, verb, object_type, object_id, audience)
    VALUES (user_id, 'created', 'bucket', bucket_id, p_visibility);
    
    RETURN bucket_id;
END;
$$;
