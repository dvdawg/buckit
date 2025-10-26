
SELECT 'Step 1: Checking bucket_collaborators table' as step;
SELECT COUNT(*) as total_collaborators FROM bucket_collaborators;

SELECT 'Step 2: Checking users table' as step;
SELECT COUNT(*) as total_users FROM users;
SELECT id, handle, full_name FROM users LIMIT 3;

SELECT 'Step 3: Checking buckets table' as step;
SELECT COUNT(*) as total_buckets FROM buckets;
SELECT id, owner_id, title FROM buckets LIMIT 3;

SELECT 'Step 4: Testing me_user_id function' as step;
SELECT 
    auth.uid() as auth_uid,
    me_user_id() as me_user_id_result;

SELECT 'Step 5: Checking table structure' as step;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bucket_collaborators' 
ORDER BY ordinal_position;
