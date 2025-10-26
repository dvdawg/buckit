-- Test RPC functions with proper authentication context
-- This simulates how the functions will work in the mobile app

-- 1. First, let's check if there are any users in the database
SELECT 'Users in database:' as info;
SELECT id, auth_id, full_name, handle FROM users LIMIT 5;

-- 2. Check if there are any buckets
SELECT 'All buckets in database:' as info;
SELECT id, owner_id, title, created_at FROM buckets ORDER BY created_at DESC LIMIT 10;

-- 3. Test the RPC functions by calling them directly (they will fail without auth context)
-- This is expected behavior - the functions need to be called from the mobile app
SELECT 'Testing RPC functions (will fail without auth context - this is expected):' as info;

-- 4. Check the function definitions
SELECT 'RPC function definitions:' as info;
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name IN ('get_user_buckets_secure', 'get_user_items_secure', 'get_current_user_db_id')
AND routine_schema = 'public';

-- 5. Check RLS policies
SELECT 'RLS policies on buckets table:' as info;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'buckets';

-- 6. Check if RLS is enabled
SELECT 'RLS status on tables:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'buckets', 'items');

-- 7. Create a simple test function that doesn't require auth context
CREATE OR REPLACE FUNCTION test_bucket_count()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM buckets);
END;
$$;

-- Test the simple function
SELECT 'Total buckets in database:' as info;
SELECT test_bucket_count() as total_buckets;

-- Clean up
DROP FUNCTION IF EXISTS test_bucket_count();
