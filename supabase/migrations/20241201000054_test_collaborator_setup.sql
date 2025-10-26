-- Test and setup collaborator relationships
-- This migration will help us verify and create collaborator relationships

-- Function to test if a user has any collaborator relationships
CREATE OR REPLACE FUNCTION test_user_collaborators(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    total_buckets INTEGER,
    owned_buckets INTEGER,
    collaborator_records INTEGER,
    collaborator_buckets INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_buckets INTEGER;
    owned_buckets INTEGER;
    collaborator_records INTEGER;
    collaborator_buckets INTEGER;
BEGIN
    -- Count total buckets
    SELECT COUNT(*) INTO total_buckets FROM buckets;
    
    -- Count owned buckets
    SELECT COUNT(*) INTO owned_buckets FROM buckets WHERE owner_id = p_user_id;
    
    -- Count collaborator records for this user
    SELECT COUNT(*) INTO collaborator_records FROM bucket_collaborators bc WHERE bc.user_id = p_user_id;
    
    -- Count buckets where user is a collaborator
    SELECT COUNT(*) INTO collaborator_buckets 
    FROM buckets b
    WHERE EXISTS (
        SELECT 1 FROM bucket_collaborators bc
        WHERE bc.bucket_id = b.id
        AND bc.user_id = p_user_id
        AND bc.accepted_at IS NOT NULL
    );
    
    RETURN QUERY SELECT p_user_id, total_buckets, owned_buckets, collaborator_records, collaborator_buckets;
END;
$$;

-- Function to create a test collaborator relationship
CREATE OR REPLACE FUNCTION create_test_collaborator(
    p_bucket_id UUID,
    p_collaborator_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_owner_id UUID;
BEGIN
    -- Get bucket owner
    SELECT owner_id INTO bucket_owner_id FROM buckets WHERE id = p_bucket_id;
    
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_collaborator_user_id) THEN
        RAISE EXCEPTION 'Collaborator user not found';
    END IF;
    
    -- Insert collaborator record
    INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, accepted_at)
    VALUES (p_bucket_id, p_collaborator_user_id, bucket_owner_id, NOW())
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = bucket_owner_id,
        invited_at = NOW(),
        accepted_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Function to list all users for testing
CREATE OR REPLACE FUNCTION list_users_for_testing()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    handle TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT id, full_name, handle, created_at FROM users ORDER BY created_at DESC;
$$;

-- Function to list all buckets for testing
CREATE OR REPLACE FUNCTION list_buckets_for_testing()
RETURNS TABLE (
    id UUID,
    title TEXT,
    owner_id UUID,
    owner_name TEXT,
    visibility TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        b.id,
        b.title,
        b.owner_id,
        u.full_name as owner_name,
        b.visibility
    FROM buckets b
    JOIN users u ON b.owner_id = u.id
    ORDER BY b.created_at DESC;
$$;
