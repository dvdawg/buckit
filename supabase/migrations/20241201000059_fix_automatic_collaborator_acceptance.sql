-- Fix collaborator system to automatically accept invitations
-- When a user is invited, they should immediately become a collaborator without needing to accept

-- 1. Fix add_bucket_collaborator function to automatically set accepted_at
DROP FUNCTION IF EXISTS add_bucket_collaborator(UUID, UUID);

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
    -- Get current user ID using the consistent me_user_id function
    current_user_id := me_user_id();
    
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
    
    -- Insert or update collaborator record with accepted_at automatically set to NOW()
    -- This means the user is immediately a collaborator when invited
    INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, invited_at, accepted_at)
    VALUES (p_bucket_id, p_user_id, current_user_id, NOW(), NOW())
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = current_user_id,
        invited_at = NOW(),
        accepted_at = NOW(); -- Always set accepted_at to NOW() on update too
    
    RETURN TRUE;
END;
$$;

-- 2. Update all existing collaborator records to have accepted_at set
-- This ensures that any existing collaborators are properly recognized
UPDATE bucket_collaborators 
SET accepted_at = COALESCE(accepted_at, invited_at, created_at, NOW())
WHERE accepted_at IS NULL;

-- 3. Fix get_bucket_collaborators function to not require accepted_at check
-- Since all collaborators are automatically accepted, we don't need to check accepted_at
DROP FUNCTION IF EXISTS get_bucket_collaborators(UUID);

CREATE OR REPLACE FUNCTION get_bucket_collaborators(p_bucket_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    handle TEXT,
    avatar_url TEXT,
    role TEXT,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        bc.id,
        bc.user_id,
        u.full_name,
        u.handle,
        u.avatar_url,
        bc.role,
        bc.invited_at,
        bc.accepted_at
    FROM bucket_collaborators bc
    JOIN users u ON bc.user_id = u.id
    WHERE bc.bucket_id = p_bucket_id
    AND (
        -- Bucket owner can see all collaborators
        EXISTS (
            SELECT 1 FROM buckets b 
            WHERE b.id = p_bucket_id 
            AND b.owner_id = me_user_id()
        )
        -- Or user is a collaborator themselves
        OR bc.user_id = me_user_id()
    )
    ORDER BY bc.created_at ASC;
$$;

-- 4. Fix get_user_buckets_by_id function to not require accepted_at check
-- Since all collaborators are automatically accepted, we don't need to check accepted_at
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
        )) as is_collaborator,
        -- Check if the specified user can edit (owner or collaborator)
        (b.owner_id = p_user_id OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
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
        )
    )
    AND (
        -- User can see their own buckets (always true for p_user_id)
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
        )
    )
    ORDER BY b.created_at DESC;
$$;

-- 5. Fix get_bucket_by_id function to not require accepted_at check
DROP FUNCTION IF EXISTS get_bucket_by_id(UUID);

CREATE OR REPLACE FUNCTION get_bucket_by_id(p_bucket_id UUID)
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
        b.is_collaborative,
        b.created_at,
        b.owner_id,
        -- Check if the current user is a collaborator (not the owner)
        (b.owner_id != me_user_id() AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
        )) as is_collaborator,
        -- Check if the current user can edit (owner or collaborator)
        (b.owner_id = me_user_id() OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
        )) as can_edit
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
        -- Or user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
        )
    );
$$;

-- 6. Create a function to test the automatic collaborator system
CREATE OR REPLACE FUNCTION test_automatic_collaborator_system(p_bucket_id UUID, p_user_id UUID)
RETURNS TABLE (
    test_name TEXT,
    result BOOLEAN,
    message TEXT,
    value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    collaborator_exists BOOLEAN;
    accepted_at_set BOOLEAN;
    bucket_visible BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    
    -- Test 1: Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT 'User Authentication'::TEXT, false::BOOLEAN, 'User not authenticated'::TEXT, 'NULL'::TEXT;
        RETURN;
    END IF;
    
    -- Test 2: Check if collaborator record exists
    SELECT EXISTS(
        SELECT 1 FROM bucket_collaborators 
        WHERE bucket_id = p_bucket_id 
        AND user_id = p_user_id
    ) INTO collaborator_exists;
    
    RETURN QUERY SELECT 'Collaborator Record Exists'::TEXT, collaborator_exists::BOOLEAN,
        CASE WHEN collaborator_exists THEN 'Collaborator record found' ELSE 'No collaborator record found' END::TEXT,
        collaborator_exists::TEXT;
    
    -- Test 3: Check if accepted_at is set
    SELECT EXISTS(
        SELECT 1 FROM bucket_collaborators 
        WHERE bucket_id = p_bucket_id 
        AND user_id = p_user_id
        AND accepted_at IS NOT NULL
    ) INTO accepted_at_set;
    
    RETURN QUERY SELECT 'Accepted At Set'::TEXT, accepted_at_set::BOOLEAN,
        CASE WHEN accepted_at_set THEN 'accepted_at is set' ELSE 'accepted_at is NULL' END::TEXT,
        accepted_at_set::TEXT;
    
    -- Test 4: Check if bucket is visible to user
    SELECT EXISTS(
        SELECT 1 FROM get_user_buckets_by_id(p_user_id)
        WHERE id = p_bucket_id
    ) INTO bucket_visible;
    
    RETURN QUERY SELECT 'Bucket Visible to User'::TEXT, bucket_visible::BOOLEAN,
        CASE WHEN bucket_visible THEN 'Bucket appears in user bucket list' ELSE 'Bucket does not appear in user bucket list' END::TEXT,
        bucket_visible::TEXT;
    
    -- Test 5: Check if user is marked as collaborator
    SELECT EXISTS(
        SELECT 1 FROM get_user_buckets_by_id(p_user_id)
        WHERE id = p_bucket_id AND is_collaborator = true
    ) INTO collaborator_exists;
    
    RETURN QUERY SELECT 'User Marked as Collaborator'::TEXT, collaborator_exists::BOOLEAN,
        CASE WHEN collaborator_exists THEN 'User is marked as collaborator' ELSE 'User is not marked as collaborator' END::TEXT,
        collaborator_exists::TEXT;
    
END;
$$;
