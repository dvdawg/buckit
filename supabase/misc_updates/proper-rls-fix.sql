
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can create buckets" ON buckets;
DROP POLICY IF EXISTS "Users can update their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can delete their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;

DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;
DROP POLICY IF EXISTS "Users can view items in their buckets" ON items;
DROP POLICY IF EXISTS "Users can create items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;
DROP POLICY IF EXISTS "Users can view public items" ON items;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM users WHERE auth_id = auth.uid();
$$;

CREATE POLICY "buckets_owner_policy" ON buckets
    FOR ALL USING (owner_id = get_current_user_id());

CREATE POLICY "buckets_public_policy" ON buckets
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "items_owner_policy" ON items
    FOR ALL USING (owner_id = get_current_user_id());

CREATE POLICY "items_public_policy" ON items
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "items_bucket_access_policy" ON items
    FOR SELECT USING (
        bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id = get_current_user_id()
        )
    );
