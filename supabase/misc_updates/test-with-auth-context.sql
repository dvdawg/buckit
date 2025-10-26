
SELECT 'Users in database:' as info;
SELECT id, auth_id, full_name, handle FROM users LIMIT 5;

SELECT 'All buckets in database:' as info;
SELECT id, owner_id, title, created_at FROM buckets ORDER BY created_at DESC LIMIT 10;

SELECT 'Testing RPC functions (will fail without auth context - this is expected):' as info;

SELECT 'RPC function definitions:' as info;
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name IN ('get_user_buckets_secure', 'get_user_items_secure', 'get_current_user_db_id')
AND routine_schema = 'public';

SELECT 'RLS policies on buckets table:' as info;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'buckets';

SELECT 'RLS status on tables:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'buckets', 'items');

CREATE OR REPLACE FUNCTION test_bucket_count()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM buckets);
END;
$$;

SELECT 'Total buckets in database:' as info;
SELECT test_bucket_count() as total_buckets;

DROP FUNCTION IF EXISTS test_bucket_count();
