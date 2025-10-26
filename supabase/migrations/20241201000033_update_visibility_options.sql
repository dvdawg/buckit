
ALTER TABLE buckets DROP CONSTRAINT IF EXISTS buckets_visibility_check;
ALTER TABLE buckets ADD CONSTRAINT buckets_visibility_check 
    CHECK (visibility IN ('public', 'private'));

ALTER TABLE buckets ALTER COLUMN visibility SET DEFAULT 'private';

UPDATE buckets SET visibility = 'private' WHERE visibility = 'manual';
UPDATE buckets SET visibility = 'private' WHERE visibility = 'friends';

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_visibility_check;
ALTER TABLE items ADD CONSTRAINT items_visibility_check 
    CHECK (visibility IN ('public', 'private'));

ALTER TABLE items ALTER COLUMN visibility SET DEFAULT 'private';

UPDATE items SET visibility = 'private' WHERE visibility = 'manual';
UPDATE items SET visibility = 'private' WHERE visibility = 'friends';

DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view private buckets" ON buckets;

CREATE POLICY "Users can view public buckets" ON buckets
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view private buckets" ON buckets
    FOR SELECT USING (
        visibility = 'private' AND 
        EXISTS (
            SELECT 1 FROM friendships 
            WHERE (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                   OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
            AND (user_id = owner_id OR friend_id = owner_id)
            AND status = 'accepted'
        )
    );

DROP POLICY IF EXISTS "Users can view friend's items" ON items;
DROP POLICY IF EXISTS "Users can view public items" ON items;
DROP POLICY IF EXISTS "Users can view items in public buckets" ON items;
DROP POLICY IF EXISTS "Users can view items in private buckets" ON items;

CREATE POLICY "Users can view items in public buckets" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM buckets b
            WHERE b.id = items.bucket_id
            AND b.visibility = 'public'
        )
    );

CREATE POLICY "Users can view items in private buckets" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM buckets b
            WHERE b.id = items.bucket_id
            AND b.visibility = 'private'
            AND EXISTS (
                SELECT 1 FROM friendships f
                WHERE (f.user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                       OR f.friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
                AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
                AND f.status = 'accepted'
            )
        )
    );

DROP FUNCTION IF EXISTS get_user_buckets(UUID);
CREATE FUNCTION get_user_buckets(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    cover_url TEXT,
    emoji TEXT,
    color TEXT,
    visibility TEXT,
    challenge_count INTEGER,
    completion_percentage NUMERIC,
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
        OR b.visibility = 'public'
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
        ))
    )
    ORDER BY b.created_at DESC;
$$;

DROP FUNCTION IF EXISTS create_bucket_secure(TEXT, TEXT, TEXT);
CREATE FUNCTION create_bucket_secure(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_visibility TEXT DEFAULT 'private'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_id UUID;
    user_id UUID;
BEGIN
    user_id := (SELECT id FROM users WHERE auth_id = auth.uid());
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF p_visibility NOT IN ('public', 'private') THEN
        RAISE EXCEPTION 'Invalid visibility option. Must be "public" or "private"';
    END IF;
    
    INSERT INTO buckets (owner_id, title, description, visibility)
    VALUES (user_id, p_title, p_description, p_visibility)
    RETURNING id INTO bucket_id;
    
    RETURN bucket_id;
END;
$$;

DROP FUNCTION IF EXISTS get_bucket_visibility_options();
CREATE FUNCTION get_bucket_visibility_options()
RETURNS TABLE (
    value TEXT,
    label TEXT,
    description TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 'private'::TEXT as value, 'Private'::TEXT as label, 'Only your friends can see this bucket'::TEXT as description
    UNION ALL
    SELECT 'public'::TEXT as value, 'Public'::TEXT as label, 'Everyone can see this bucket'::TEXT as description;
$$;
