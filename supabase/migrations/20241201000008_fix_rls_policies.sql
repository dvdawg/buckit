-- Fix RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;
DROP POLICY IF EXISTS "Users can create buckets" ON buckets;
DROP POLICY IF EXISTS "Users can update their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can delete their own buckets" ON buckets;

DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;
DROP POLICY IF EXISTS "Users can view public items" ON items;
DROP POLICY IF EXISTS "Users can view items in their buckets" ON items;
DROP POLICY IF EXISTS "Users can create items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

-- Create simpler, non-recursive policies for buckets
CREATE POLICY "Users can view their own buckets" ON buckets
    FOR SELECT USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view public buckets" ON buckets
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can create buckets" ON buckets
    FOR INSERT WITH CHECK (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own buckets" ON buckets
    FOR UPDATE USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own buckets" ON buckets
    FOR DELETE USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Create simpler, non-recursive policies for items
CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view public items" ON items
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view items in their buckets" ON items
    FOR SELECT USING (
        bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "Users can create items" ON items
    FOR INSERT WITH CHECK (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own items" ON items
    FOR UPDATE USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own items" ON items
    FOR DELETE USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
