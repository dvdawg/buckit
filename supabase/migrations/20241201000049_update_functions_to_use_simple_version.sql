-- Update all functions to use the simpler get_current_user_db_id_simple() function
-- This should be more reliable than the complex version

-- Update get_user_buckets function
DROP FUNCTION IF EXISTS get_user_buckets(UUID);

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
        -- Check if current user is a collaborator
        EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = get_current_user_db_id_simple()
            AND bc.accepted_at IS NOT NULL
        ) as is_collaborator,
        -- Check if current user can edit (owner or collaborator)
        (b.owner_id = get_current_user_db_id_simple() OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = get_current_user_db_id_simple()
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
        p_user_id = get_current_user_db_id_simple()
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is private and user is friends with the bucket owner
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = get_current_user_db_id_simple() OR f.friend_id = get_current_user_db_id_simple())
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        -- Or user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = get_current_user_db_id_simple()
            AND bc.accepted_at IS NOT NULL
        )
    )
    ORDER BY b.created_at DESC;
$$;

-- Update add_bucket_collaborator function
CREATE OR REPLACE FUNCTION add_bucket_collaborator(
    p_bucket_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    bucket_owner_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := get_current_user_db_id_simple();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if current user owns the bucket
    SELECT owner_id INTO bucket_owner_id
    FROM buckets
    WHERE id = p_bucket_id;
    
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != current_user_id THEN
        RAISE EXCEPTION 'Only bucket owners can add collaborators';
    END IF;
    
    -- Check if user is trying to add themselves
    IF p_user_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as a collaborator';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Insert or update collaborator record
    INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, accepted_at)
    VALUES (p_bucket_id, p_user_id, current_user_id, NOW())
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = current_user_id,
        invited_at = NOW(),
        accepted_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Update debug function to use simple version
CREATE OR REPLACE FUNCTION debug_collaborators()
RETURNS TABLE (
    current_user_id UUID,
    total_buckets INTEGER,
    owned_buckets INTEGER,
    collaborator_buckets INTEGER,
    total_collaborator_records INTEGER,
    user_collaborator_records INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    total_buckets INTEGER;
    owned_buckets INTEGER;
    collaborator_buckets INTEGER;
    total_collaborator_records INTEGER;
    user_collaborator_records INTEGER;
BEGIN
    -- Get current user ID using simple function
    current_user_id := get_current_user_db_id_simple();
    
    -- Count total buckets
    SELECT COUNT(*) INTO total_buckets FROM buckets;
    
    -- Count owned buckets
    SELECT COUNT(*) INTO owned_buckets FROM buckets WHERE owner_id = current_user_id;
    
    -- Count buckets where user is a collaborator
    SELECT COUNT(*) INTO collaborator_buckets 
    FROM buckets b
    WHERE EXISTS (
        SELECT 1 FROM bucket_collaborators bc
        WHERE bc.bucket_id = b.id
        AND bc.user_id = current_user_id
        AND bc.accepted_at IS NOT NULL
    );
    
    -- Count total collaborator records
    SELECT COUNT(*) INTO total_collaborator_records FROM bucket_collaborators;
    
    -- Count collaborator records for current user
    SELECT COUNT(*) INTO user_collaborator_records 
    FROM bucket_collaborators 
    WHERE user_id = current_user_id;
    
    RETURN QUERY SELECT 
        current_user_id,
        total_buckets,
        owned_buckets,
        collaborator_buckets,
        total_collaborator_records,
        user_collaborator_records;
END;
$$;
