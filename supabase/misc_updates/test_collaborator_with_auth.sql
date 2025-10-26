
SELECT 'Available Users:' as info;
SELECT id, auth_id, handle, full_name FROM users ORDER BY created_at DESC;

SELECT 'Available Buckets:' as info;
SELECT id, owner_id, title FROM buckets ORDER BY created_at DESC;



/*
SET LOCAL "request.jwt.claims" = '{"sub": "your-auth-id-here"}';

SELECT add_bucket_collaborator('your-bucket-id', 'your-friend-user-id');
*/

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

/*
SELECT * FROM get_bucket_collaborators('your-bucket-id');
*/
