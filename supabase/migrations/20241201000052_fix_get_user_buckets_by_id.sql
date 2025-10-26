-- Fix get_user_buckets_by_id function to properly return owner_id and collaborator buckets
-- The current function is missing owner_id and not including collaborator buckets

DROP FUNCTION IF EXISTS get_user_buckets_by_id(UUID);

CREATE OR REPLACE FUNCTION get_user_buckets_by_id(p_user_id UUID)
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
    created_at TIMESTAMPTZ,
    owner_id UUID,
    is_collaborator BOOLEAN,
    can_edit BOOLEAN
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
        b.created_at,
        b.owner_id,
        -- Check if the specified user is a collaborator (not the owner)
        (b.owner_id != p_user_id AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )) as is_collaborator,
        -- Check if the specified user can edit (owner or collaborator)
        (b.owner_id = p_user_id OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )) as can_edit
    FROM buckets b
    WHERE (
        -- User's own buckets
        b.owner_id = p_user_id
        -- Or buckets where user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )
    )
    AND (
        -- User can see their own buckets
        p_user_id = p_user_id  -- Always true for own buckets
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is private and user is friends with the bucket owner
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        -- Or user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )
    )
    ORDER BY b.created_at DESC;
$$;
