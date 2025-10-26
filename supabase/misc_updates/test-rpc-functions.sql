
SELECT 'Testing get_user_buckets_secure function...' as test_step;

SELECT * FROM get_user_buckets_secure();

SELECT 'All buckets in database:' as info;
SELECT id, owner_id, title, created_at FROM buckets ORDER BY created_at DESC LIMIT 10;

SELECT 'Current auth context:' as info;
SELECT auth.uid() as current_auth_uid;

SELECT 'Current user DB ID:' as info;
SELECT get_current_user_db_id() as user_db_id;

SELECT 'Buckets returned by RPC function:' as info;
SELECT COUNT(*) as bucket_count FROM get_user_buckets_secure();

SELECT 'RLS policies on buckets table:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'buckets';
