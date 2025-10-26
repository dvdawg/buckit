
SELECT 
    id, 
    owner_id, 
    title, 
    description, 
    visibility, 
    emoji, 
    color, 
    created_at 
FROM buckets 
ORDER BY created_at DESC 
LIMIT 10;

SELECT 
    b.id, 
    b.title, 
    b.description,
    b.emoji,
    b.color,
    b.created_at,
    u.auth_id,
    u.handle
FROM buckets b
JOIN users u ON b.owner_id = u.id
ORDER BY b.created_at DESC;

DROP POLICY IF EXISTS "buckets_owner_access" ON buckets;
DROP POLICY IF EXISTS "buckets_public_read" ON buckets;
DROP POLICY IF EXISTS "buckets_authenticated_only" ON buckets;
DROP POLICY IF EXISTS "buckets_read_policy" ON buckets;
DROP POLICY IF EXISTS "buckets_write_policy" ON buckets;
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can create buckets" ON buckets;
DROP POLICY IF EXISTS "Users can update their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can delete their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;

CREATE POLICY "buckets_allow_all" ON buckets
    FOR ALL USING (auth.uid() IS NOT NULL);
