
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can create buckets" ON buckets;
DROP POLICY IF EXISTS "Users can update their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can delete their own buckets" ON buckets;

DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;
DROP POLICY IF EXISTS "Users can view items in their buckets" ON items;
DROP POLICY IF EXISTS "Users can create items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

CREATE POLICY "bucket_owner_all" ON buckets
    FOR ALL USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "bucket_public_view" ON buckets
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "item_owner_all" ON items
    FOR ALL USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "item_public_view" ON items
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "item_bucket_access" ON items
    FOR SELECT USING (
        bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );
