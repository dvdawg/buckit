-- Test the RPC functions to ensure they're working correctly
-- This will help debug why buckets are still showing all data

-- Test 1: Check if the get_user_buckets_secure function exists and works
SELECT 'Testing get_user_buckets_secure function...' as test_step;

-- Test 2: Check what the function returns
SELECT * FROM get_user_buckets_secure();

-- Test 3: Check if there are any buckets in the database
SELECT 'All buckets in database:' as info;
SELECT id, owner_id, title, created_at FROM buckets ORDER BY created_at DESC LIMIT 10;

-- Test 4: Check current user context
SELECT 'Current auth context:' as info;
SELECT auth.uid() as current_auth_uid;

-- Test 5: Check if get_current_user_db_id works
SELECT 'Current user DB ID:' as info;
SELECT get_current_user_db_id() as user_db_id;

-- Test 6: Check if the RPC function is filtering correctly
SELECT 'Buckets returned by RPC function:' as info;
SELECT COUNT(*) as bucket_count FROM get_user_buckets_secure();

-- Test 7: Check RLS policies
SELECT 'RLS policies on buckets table:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'buckets';
