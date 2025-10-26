-- Test RPC function security to verify it's filtering correctly
-- This will help identify if the RPC function is working properly

-- 1. Check all buckets in the database
SELECT 'All buckets in database:' as info;
SELECT 
    b.id,
    b.title,
    b.owner_id,
    u.full_name as owner_name,
    u.handle as owner_handle,
    b.created_at
FROM buckets b
LEFT JOIN users u ON b.owner_id = u.id
ORDER BY b.created_at DESC;

-- 2. Check all users in the database
SELECT 'All users in database:' as info;
SELECT 
    u.id,
    u.full_name,
    u.handle,
    u.auth_id,
    COUNT(b.id) as bucket_count
FROM users u
LEFT JOIN buckets b ON u.id = b.owner_id
GROUP BY u.id, u.full_name, u.handle, u.auth_id
ORDER BY bucket_count DESC;

-- 3. Test the RPC function with a specific user ID
-- First, let's create a test function that accepts a user ID parameter
CREATE OR REPLACE FUNCTION test_get_user_buckets(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    title TEXT,
    description TEXT,
    visibility TEXT,
    is_collaborative BOOLEAN,
    cover_url TEXT,
    emoji TEXT,
    color TEXT,
    challenge_count INTEGER,
    completion_percentage NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.owner_id,
        b.title,
        b.description,
        b.visibility,
        b.is_collaborative,
        b.cover_url,
        b.emoji,
        b.color,
        b.challenge_count,
        b.completion_percentage,
        b.created_at
    FROM buckets b
    WHERE b.owner_id = p_user_id
    ORDER BY b.created_at DESC;
END;
$$;

-- 4. Test the function with each user
SELECT 'Testing RPC function with each user:' as info;

DO $$
DECLARE
    user_record RECORD;
    bucket_count INTEGER;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.full_name, u.handle 
        FROM users u 
        ORDER BY u.created_at
    LOOP
        SELECT COUNT(*) INTO bucket_count FROM test_get_user_buckets(user_record.id);
        RAISE NOTICE 'User % (%) has % buckets', user_record.full_name, user_record.handle, bucket_count;
    END LOOP;
END;
$$;

-- 5. Check if there are any buckets with NULL owner_id
SELECT 'Buckets with NULL owner_id:' as info;
SELECT COUNT(*) as null_owner_count FROM buckets WHERE owner_id IS NULL;

-- 6. Clean up test function
DROP FUNCTION IF EXISTS test_get_user_buckets(UUID);

SELECT 'RPC security test completed' as status;
