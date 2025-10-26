-- Test Collaborator Functionality with Simulated Auth Context
-- This simulates what happens when your app calls the functions

-- 1. First, let's see what users exist and get their IDs
SELECT 'Available Users:' as info;
SELECT id, auth_id, handle, full_name FROM users ORDER BY created_at DESC;

-- 2. Let's see what buckets exist
SELECT 'Available Buckets:' as info;
SELECT id, owner_id, title FROM buckets ORDER BY created_at DESC;

-- 3. Test the add_bucket_collaborator function by temporarily setting auth context
-- Replace these UUIDs with actual values from your users and buckets tables

-- Example: If you have a user with auth_id 'some-auth-id' and a bucket with id 'some-bucket-id'
-- You would run this (replace with actual values):

/*
-- Set the auth context temporarily (this won't work in SQL editor, but shows the concept)
SET LOCAL "request.jwt.claims" = '{"sub": "your-auth-id-here"}';

-- Then test adding a collaborator
SELECT add_bucket_collaborator('your-bucket-id', 'your-friend-user-id');
*/

-- 4. Instead, let's manually insert a collaborator record to test
-- Replace these UUIDs with actual values from your database
/*
INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, invited_at, accepted_at)
VALUES (
    'your-bucket-id',           -- Replace with actual bucket ID
    'your-friend-user-id',      -- Replace with actual friend's user ID  
    'your-user-id',             -- Replace with your user ID
    NOW(),
    NOW()
);
*/

-- 5. Check if the manual insert worked
SELECT 'Current Collaborators:' as info;
SELECT 
    bc.id,
    bc.bucket_id,
    b.title as bucket_title,
    bc.user_id,
    u.handle as user_handle,
    bc.invited_at,
    bc.accepted_at
FROM bucket_collaborators bc
JOIN buckets b ON bc.bucket_id = b.id
JOIN users u ON bc.user_id = u.id
ORDER BY bc.created_at DESC;

-- 6. Test the get_bucket_collaborators function with a specific bucket
-- Replace 'your-bucket-id' with an actual bucket ID
/*
SELECT * FROM get_bucket_collaborators('your-bucket-id');
*/
