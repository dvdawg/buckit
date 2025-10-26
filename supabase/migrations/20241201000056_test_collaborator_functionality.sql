-- Test collaborator functionality
-- This migration creates test data and verifies that collaborator buckets are properly displayed

-- Function to create test users and buckets for testing
CREATE OR REPLACE FUNCTION create_test_collaborator_data()
RETURNS TABLE (
    user1_id UUID,
    user2_id UUID,
    bucket1_id UUID,
    bucket2_id UUID,
    collaborator_record_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    bucket1_id UUID;
    bucket2_id UUID;
    collaborator_record_id UUID;
BEGIN
    -- Create test user 1
    INSERT INTO users (id, auth_id, full_name, handle)
    VALUES (
        gen_random_uuid(),
        gen_random_uuid(),
        'Test User 1',
        'testuser1'
    )
    ON CONFLICT (auth_id) DO NOTHING
    RETURNING id INTO user1_id;
    
    -- If user already exists, get their ID
    IF user1_id IS NULL THEN
        SELECT id INTO user1_id FROM users WHERE handle = 'testuser1' LIMIT 1;
    END IF;
    
    -- Create test user 2
    INSERT INTO users (id, auth_id, full_name, handle)
    VALUES (
        gen_random_uuid(),
        gen_random_uuid(),
        'Test User 2',
        'testuser2'
    )
    ON CONFLICT (auth_id) DO NOTHING
    RETURNING id INTO user2_id;
    
    -- If user already exists, get their ID
    IF user2_id IS NULL THEN
        SELECT id INTO user2_id FROM users WHERE handle = 'testuser2' LIMIT 1;
    END IF;
    
    -- Create test bucket 1 (owned by user 1)
    INSERT INTO buckets (id, owner_id, title, description, visibility, emoji, color)
    VALUES (
        gen_random_uuid(),
        user1_id,
        'User 1 Test Bucket',
        'A test bucket owned by user 1',
        'public',
        '🎯',
        '#FF6B6B'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO bucket1_id;
    
    -- If bucket already exists, get its ID
    IF bucket1_id IS NULL THEN
        SELECT id INTO bucket1_id FROM buckets WHERE title = 'User 1 Test Bucket' LIMIT 1;
    END IF;
    
    -- Create test bucket 2 (owned by user 2)
    INSERT INTO buckets (id, owner_id, title, description, visibility, emoji, color)
    VALUES (
        gen_random_uuid(),
        user2_id,
        'User 2 Test Bucket',
        'A test bucket owned by user 2',
        'public',
        '🚀',
        '#4ECDC4'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO bucket2_id;
    
    -- If bucket already exists, get its ID
    IF bucket2_id IS NULL THEN
        SELECT id INTO bucket2_id FROM buckets WHERE title = 'User 2 Test Bucket' LIMIT 1;
    END IF;
    
    -- Create collaborator relationship (user 1 is collaborator on user 2's bucket)
    INSERT INTO bucket_collaborators (id, bucket_id, user_id, invited_by, invited_at, accepted_at)
    VALUES (
        gen_random_uuid(),
        bucket2_id,
        user1_id,
        user2_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = user2_id,
        invited_at = NOW(),
        accepted_at = NOW()
    RETURNING id INTO collaborator_record_id;
    
    -- If collaborator record already exists, get its ID
    IF collaborator_record_id IS NULL THEN
        SELECT id INTO collaborator_record_id 
        FROM bucket_collaborators 
        WHERE bucket_id = bucket2_id AND user_id = user1_id 
        LIMIT 1;
    END IF;
    
    RETURN QUERY SELECT user1_id, user2_id, bucket1_id, bucket2_id, collaborator_record_id;
END;
$$;

-- Function to test if collaborator buckets are properly returned
CREATE OR REPLACE FUNCTION test_collaborator_bucket_display()
RETURNS TABLE (
    test_name TEXT,
    user_id UUID,
    expected_buckets INTEGER,
    actual_buckets INTEGER,
    collaborator_buckets INTEGER,
    test_passed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_data RECORD;
    user1_buckets INTEGER;
    user2_buckets INTEGER;
    user1_collaborator_buckets INTEGER;
    user2_collaborator_buckets INTEGER;
BEGIN
    -- Create test data
    SELECT * INTO test_data FROM create_test_collaborator_data();
    
    -- Test user 1 buckets (should have 1 owned + 1 collaborator = 2 total)
    SELECT COUNT(*) INTO user1_buckets 
    FROM get_user_buckets_by_id(test_data.user1_id);
    
    SELECT COUNT(*) INTO user1_collaborator_buckets 
    FROM get_user_buckets_by_id(test_data.user1_id)
    WHERE is_collaborator = true;
    
    -- Test user 2 buckets (should have 1 owned = 1 total)
    SELECT COUNT(*) INTO user2_buckets 
    FROM get_user_buckets_by_id(test_data.user2_id);
    
    SELECT COUNT(*) INTO user2_collaborator_buckets 
    FROM get_user_buckets_by_id(test_data.user2_id)
    WHERE is_collaborator = true;
    
    -- Return test results
    RETURN QUERY SELECT 
        'User 1 Bucket Count'::TEXT,
        test_data.user1_id,
        2::INTEGER, -- Expected: 1 owned + 1 collaborator
        user1_buckets,
        user1_collaborator_buckets,
        (user1_buckets = 2 AND user1_collaborator_buckets = 1)::BOOLEAN;
    
    RETURN QUERY SELECT 
        'User 1 Collaborator Buckets'::TEXT,
        test_data.user1_id,
        1::INTEGER, -- Expected: 1 collaborator bucket
        user1_collaborator_buckets,
        user1_collaborator_buckets,
        (user1_collaborator_buckets = 1)::BOOLEAN;
    
    RETURN QUERY SELECT 
        'User 2 Bucket Count'::TEXT,
        test_data.user2_id,
        1::INTEGER, -- Expected: 1 owned bucket
        user2_buckets,
        user2_collaborator_buckets,
        (user2_buckets = 1 AND user2_collaborator_buckets = 0)::BOOLEAN;
END;
$$;
