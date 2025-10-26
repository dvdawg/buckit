-- Add function to get a specific bucket by ID with visibility checks
DROP FUNCTION IF EXISTS get_bucket_by_id(UUID);
CREATE FUNCTION get_bucket_by_id(p_bucket_id UUID)
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
    is_collaborative BOOLEAN,
    created_at TIMESTAMPTZ,
    owner_id UUID
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
        b.is_collaborative,
        b.created_at,
        b.owner_id
    FROM buckets b
    WHERE b.id = p_bucket_id
    AND (
        -- User can see their own buckets
        b.owner_id = me_user_id()
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is private and user is friends with the bucket owner
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
    );
$$;

-- Add function to get items for a specific bucket with visibility checks
DROP FUNCTION IF EXISTS get_bucket_items(UUID);
CREATE FUNCTION get_bucket_items(p_bucket_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    location_name TEXT,
    deadline TEXT,
    tags TEXT[],
    price_min INTEGER,
    price_max INTEGER,
    difficulty INTEGER,
    visibility TEXT,
    satisfaction_rating INTEGER,
    urgency_level TEXT,
    is_completed BOOLEAN,
    completed_at TEXT,
    created_at TIMESTAMPTZ,
    bucket_emoji TEXT,
    bucket_title TEXT,
    bucket_color TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        i.id,
        i.title,
        i.description,
        i.location_name,
        i.deadline,
        i.tags,
        i.price_min,
        i.price_max,
        i.difficulty,
        i.visibility,
        i.satisfaction_rating,
        i.urgency_level,
        i.is_completed,
        i.completed_at,
        i.created_at,
        b.emoji as bucket_emoji,
        b.title as bucket_title,
        b.color as bucket_color
    FROM items i
    JOIN buckets b ON i.bucket_id = b.id
    WHERE i.bucket_id = p_bucket_id
    AND (
        -- User can see items in their own buckets
        b.owner_id = me_user_id()
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is private and user is friends with the bucket owner
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
    )
    ORDER BY i.created_at DESC;
$$;
