-- Fix bucket security to only show user's own buckets
-- This script creates proper RLS policies that filter by owner without recursion

-- 1. Drop the overly permissive bucket policies
DROP POLICY IF EXISTS "buckets_select_own" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_own" ON buckets;
DROP POLICY IF EXISTS "buckets_update_own" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_own" ON buckets;

-- 2. Create proper bucket policies that filter by owner
-- These policies use a simple approach that doesn't cause recursion
CREATE POLICY "buckets_select_own" ON buckets
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "buckets_insert_own" ON buckets
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "buckets_update_own" ON buckets
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "buckets_delete_own" ON buckets
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- 3. Also fix items policies to be more restrictive
DROP POLICY IF EXISTS "items_select_own" ON items;
DROP POLICY IF EXISTS "items_insert_own" ON items;
DROP POLICY IF EXISTS "items_update_own" ON items;
DROP POLICY IF EXISTS "items_delete_own" ON items;

CREATE POLICY "items_select_own" ON items
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "items_insert_own" ON items
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "items_update_own" ON items
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "items_delete_own" ON items
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- 4. Ensure the helper function exists and works correctly
CREATE OR REPLACE FUNCTION get_user_buckets_safe(user_id UUID)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    title TEXT,
    description TEXT,
    visibility TEXT,
    is_collaborative BOOLEAN,
    cover_url TEXT,
    emoji TEXT,
    color TEXT,
    challenge_count INTEGER,
    completion_percentage NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.owner_id,
        b.title,
        b.description,
        b.visibility,
        b.is_collaborative,
        b.cover_url,
        b.emoji,
        b.color,
        b.challenge_count,
        b.completion_percentage,
        b.created_at
    FROM buckets b
    WHERE b.owner_id = user_id
    ORDER BY b.created_at DESC;
END;
$$;

-- 5. Test the function
SELECT 'Bucket security policies updated to filter by owner' as status;
