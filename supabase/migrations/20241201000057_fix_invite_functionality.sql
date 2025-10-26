-- Fix invite functionality and ensure collaborator buckets are properly displayed
-- This migration fixes the frontend invite button functionality

-- 1. Ensure me_user_id function is working correctly
CREATE OR REPLACE FUNCTION me_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the current auth user ID
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get the corresponding user ID from the users table
    SELECT id INTO user_id FROM users WHERE auth_id = user_id LIMIT 1;
    
    RETURN user_id;
END;
$$;

-- 2. Fix add_bucket_collaborator function to be consistent
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
    
    -- Insert or update collaborator record with accepted_at set
    INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, invited_at, accepted_at)
    VALUES (p_bucket_id, p_user_id, current_user_id, NOW(), NOW())
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = current_user_id,
        invited_at = NOW(),
        accepted_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- 3. Fix remove_bucket_collaborator function
CREATE OR REPLACE FUNCTION remove_bucket_collaborator(
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
        RAISE EXCEPTION 'Only bucket owners can remove collaborators';
    END IF;
    
    -- Remove collaborator
    DELETE FROM bucket_collaborators
    WHERE bucket_id = p_bucket_id AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- 4. Fix get_bucket_collaborators function
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

-- 5. Create a function to test the invite functionality
CREATE OR REPLACE FUNCTION test_invite_functionality(p_bucket_id UUID, p_user_id UUID)
RETURNS TABLE (
    test_name TEXT,
    result BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    bucket_owner_id UUID;
    collaborator_exists BOOLEAN;
    bucket_exists BOOLEAN;
    user_exists BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    
    -- Test 1: Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT 'User Authentication'::TEXT, false::BOOLEAN, 'User not authenticated'::TEXT;
        RETURN;
    END IF;
    
    -- Test 2: Check if bucket exists
    SELECT EXISTS(SELECT 1 FROM buckets WHERE id = p_bucket_id) INTO bucket_exists;
    IF NOT bucket_exists THEN
        RETURN QUERY SELECT 'Bucket Exists'::TEXT, false::BOOLEAN, 'Bucket not found'::TEXT;
        RETURN;
    END IF;
    
    -- Test 3: Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
    IF NOT user_exists THEN
        RETURN QUERY SELECT 'User Exists'::TEXT, false::BOOLEAN, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- Test 4: Check if current user owns the bucket
    SELECT owner_id INTO bucket_owner_id FROM buckets WHERE id = p_bucket_id;
    IF bucket_owner_id != current_user_id THEN
        RETURN QUERY SELECT 'Bucket Ownership'::TEXT, false::BOOLEAN, 'User does not own the bucket'::TEXT;
        RETURN;
    END IF;
    
    -- Test 5: Check if collaborator relationship exists
    SELECT EXISTS(
        SELECT 1 FROM bucket_collaborators 
        WHERE bucket_id = p_bucket_id 
        AND user_id = p_user_id 
        AND accepted_at IS NOT NULL
    ) INTO collaborator_exists;
    
    IF collaborator_exists THEN
        RETURN QUERY SELECT 'Collaborator Relationship'::TEXT, true::BOOLEAN, 'Collaborator relationship exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Collaborator Relationship'::TEXT, false::BOOLEAN, 'Collaborator relationship does not exist'::TEXT;
    END IF;
    
    -- Test 6: Check if bucket appears in user's bucket list
    IF collaborator_exists THEN
        SELECT EXISTS(
            SELECT 1 FROM get_user_buckets_by_id(p_user_id)
            WHERE id = p_bucket_id AND is_collaborator = true
        ) INTO collaborator_exists;
        
        IF collaborator_exists THEN
            RETURN QUERY SELECT 'Bucket in User List'::TEXT, true::BOOLEAN, 'Bucket appears in user bucket list'::TEXT;
        ELSE
            RETURN QUERY SELECT 'Bucket in User List'::TEXT, false::BOOLEAN, 'Bucket does not appear in user bucket list'::TEXT;
        END IF;
    END IF;
    
END;
$$;

-- 6. Create a function to debug collaborator issues
CREATE OR REPLACE FUNCTION debug_collaborator_issue(p_bucket_id UUID, p_user_id UUID)
RETURNS TABLE (
    debug_info TEXT,
    value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    bucket_owner_id UUID;
    collaborator_count INTEGER;
    bucket_count INTEGER;
    user_count INTEGER;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    
    -- Debug info
    RETURN QUERY SELECT 'Current User ID'::TEXT, COALESCE(current_user_id::TEXT, 'NULL')::TEXT;
    RETURN QUERY SELECT 'Auth UID'::TEXT, COALESCE(auth.uid()::TEXT, 'NULL')::TEXT;
    
    -- Check bucket
    SELECT owner_id INTO bucket_owner_id FROM buckets WHERE id = p_bucket_id;
    RETURN QUERY SELECT 'Bucket Owner ID'::TEXT, COALESCE(bucket_owner_id::TEXT, 'NULL')::TEXT;
    
    -- Check collaborator records
    SELECT COUNT(*) INTO collaborator_count FROM bucket_collaborators WHERE bucket_id = p_bucket_id AND user_id = p_user_id;
    RETURN QUERY SELECT 'Collaborator Records'::TEXT, collaborator_count::TEXT;
    
    -- Check if accepted_at is set
    SELECT COUNT(*) INTO collaborator_count FROM bucket_collaborators WHERE bucket_id = p_bucket_id AND user_id = p_user_id AND accepted_at IS NOT NULL;
    RETURN QUERY SELECT 'Accepted Collaborator Records'::TEXT, collaborator_count::TEXT;
    
    -- Check user buckets
    SELECT COUNT(*) INTO bucket_count FROM get_user_buckets_by_id(p_user_id) WHERE id = p_bucket_id;
    RETURN QUERY SELECT 'User Buckets Count'::TEXT, bucket_count::TEXT;
    
    -- Check if bucket is marked as collaborator
    SELECT COUNT(*) INTO bucket_count FROM get_user_buckets_by_id(p_user_id) WHERE id = p_bucket_id AND is_collaborator = true;
    RETURN QUERY SELECT 'Collaborator Buckets Count'::TEXT, bucket_count::TEXT;
    
END;
$$;
