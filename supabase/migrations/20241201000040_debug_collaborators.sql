-- Debug migration to help troubleshoot collaborator visibility issues
-- This creates a simple function to check collaborator data

-- Function to debug collaborator data
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
    -- Get current user ID
    current_user_id := get_current_user_db_id();
    
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

-- Function to list all collaborator records
CREATE OR REPLACE FUNCTION list_all_collaborators()
RETURNS TABLE (
    bucket_id UUID,
    bucket_title TEXT,
    user_id UUID,
    user_name TEXT,
    role TEXT,
    accepted_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        bc.bucket_id,
        b.title as bucket_title,
        bc.user_id,
        u.full_name as user_name,
        bc.role,
        bc.accepted_at
    FROM bucket_collaborators bc
    JOIN buckets b ON bc.bucket_id = b.id
    JOIN users u ON bc.user_id = u.id
    ORDER BY bc.created_at DESC;
$$;
