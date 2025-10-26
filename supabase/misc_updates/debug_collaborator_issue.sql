
SELECT 'Current bucket_collaborators table contents:' as debug_info;
SELECT * FROM bucket_collaborators ORDER BY created_at DESC LIMIT 10;

SELECT 'Testing me_user_id() function:' as debug_info;
SELECT 
    auth.uid() as auth_uid,
    me_user_id() as me_user_id_result,
    (SELECT id FROM users WHERE auth_id = auth.uid()) as direct_user_id;

SELECT 'Current users in database:' as debug_info;
SELECT id, auth_id, handle, full_name FROM users ORDER BY created_at DESC LIMIT 5;

SELECT 'Current buckets in database:' as debug_info;
SELECT id, owner_id, title, visibility FROM buckets ORDER BY created_at DESC LIMIT 5;

SELECT 'Testing add_bucket_collaborator function:' as debug_info;

SELECT 'Testing get_bucket_collaborators function:' as debug_info;

SELECT 'Testing get_user_buckets_by_id function:' as debug_info;

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

UPDATE bucket_collaborators 
SET accepted_at = COALESCE(accepted_at, invited_at, created_at, NOW())
WHERE accepted_at IS NULL;

CREATE OR REPLACE FUNCTION test_add_collaborator(
    p_bucket_id UUID,
    p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result BOOLEAN;
    collaborator_count INTEGER;
BEGIN
    -- Try to add the collaborator
    SELECT add_bucket_collaborator(p_bucket_id, p_user_id) INTO result;
    
    -- Count collaborators for this bucket
    SELECT COUNT(*) INTO collaborator_count FROM bucket_collaborators WHERE bucket_id = p_bucket_id;
    
    RETURN 'Success: ' || result || ', Collaborator count: ' || collaborator_count;
END;
$$;

SELECT 'Final check - all collaborators:' as debug_info;
SELECT 
    bc.id,
    bc.bucket_id,
    b.title as bucket_title,
    bc.user_id,
    u.handle as user_handle,
    u.full_name as user_name,
    bc.invited_at,
    bc.accepted_at
FROM bucket_collaborators bc
JOIN buckets b ON bc.bucket_id = b.id
JOIN users u ON bc.user_id = u.id
ORDER BY bc.created_at DESC;
