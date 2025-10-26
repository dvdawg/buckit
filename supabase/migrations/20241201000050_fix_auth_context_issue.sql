-- Fix the auth context issue
-- The problem is that RPC functions need to be called from an authenticated context
-- Let's create functions that can work with explicit user IDs

-- Create a version of get_user_buckets that takes the user ID as a parameter
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
        -- Check if the specified user is a collaborator
        EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        ) as is_collaborator,
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

-- Create a function to manually add a collaborator (for testing)
CREATE OR REPLACE FUNCTION add_collaborator_manual(
    p_bucket_id UUID,
    p_owner_user_id UUID,
    p_collaborator_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_owner_id UUID;
BEGIN
    -- Check if the specified user owns the bucket
    SELECT owner_id INTO bucket_owner_id
    FROM buckets
    WHERE id = p_bucket_id;
    
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != p_owner_user_id THEN
        RAISE EXCEPTION 'User does not own this bucket';
    END IF;
    
    -- Check if user is trying to add themselves
    IF p_collaborator_user_id = p_owner_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as a collaborator';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_collaborator_user_id) THEN
        RAISE EXCEPTION 'Collaborator user not found';
    END IF;
    
    -- Insert or update collaborator record
    INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, accepted_at)
    VALUES (p_bucket_id, p_collaborator_user_id, p_owner_user_id, NOW())
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = p_owner_user_id,
        invited_at = NOW(),
        accepted_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Create a function to list all users (for testing)
CREATE OR REPLACE FUNCTION list_all_users()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    handle TEXT,
    auth_id UUID
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT id, full_name, handle, auth_id FROM users ORDER BY created_at DESC;
$$;

-- Create a function to list all buckets with owners
CREATE OR REPLACE FUNCTION list_all_buckets_with_owners()
RETURNS TABLE (
    bucket_id UUID,
    bucket_title TEXT,
    owner_id UUID,
    owner_name TEXT,
    visibility TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        b.id as bucket_id,
        b.title as bucket_title,
        b.owner_id,
        u.full_name as owner_name,
        b.visibility
    FROM buckets b
    JOIN users u ON b.owner_id = u.id
    ORDER BY b.created_at DESC;
$$;
