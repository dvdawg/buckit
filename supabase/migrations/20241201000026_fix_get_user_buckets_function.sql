-- Fix get_user_buckets function to use correct parameter name
-- The error suggests the function should use 'user_id' instead of 'p_user_id'

DROP FUNCTION IF EXISTS get_user_buckets(UUID);

CREATE OR REPLACE FUNCTION get_user_buckets(user_id UUID)
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
    WHERE b.owner_id = user_id
    AND (
        -- User can see their own buckets
        user_id = me_user_id()
        -- Or bucket is public (if we add public visibility later)
        OR b.visibility = 'public'
        -- Or bucket is friends and user is friends with the bucket owner
        OR (b.visibility = 'friends' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = user_id OR f.friend_id = user_id)
        ))
        -- Or bucket is manual and user is a collaborator
        OR (b.visibility = 'manual' AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id 
            AND bc.user_id = me_user_id()
        ))
    )
    ORDER BY b.created_at DESC;
$$;
