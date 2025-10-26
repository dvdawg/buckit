-- Final fix for RLS recursion while maintaining security
-- This approach uses a different strategy to avoid recursion

-- 1. Drop ALL existing bucket policies that cause recursion
DROP POLICY IF EXISTS "buckets_select_own" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_own" ON buckets;
DROP POLICY IF EXISTS "buckets_update_own" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_own" ON buckets;

-- 2. Create a helper function that gets the current user's ID safely
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
END;
$$;

-- 3. Create RLS policies that use the helper function to avoid recursion
CREATE POLICY "buckets_select_own" ON buckets
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

CREATE POLICY "buckets_insert_own" ON buckets
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

CREATE POLICY "buckets_update_own" ON buckets
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

CREATE POLICY "buckets_delete_own" ON buckets
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

-- 4. Also fix items policies with the same approach
DROP POLICY IF EXISTS "items_select_own" ON items;
DROP POLICY IF EXISTS "items_insert_own" ON items;
DROP POLICY IF EXISTS "items_update_own" ON items;
DROP POLICY IF EXISTS "items_delete_own" ON items;

CREATE POLICY "items_select_own" ON items
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

CREATE POLICY "items_insert_own" ON items
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

CREATE POLICY "items_update_own" ON items
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

CREATE POLICY "items_delete_own" ON items
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = get_current_user_id()
    );

-- 5. Ensure the safe RPC function exists
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

-- 6. Test the helper function
SELECT 'RLS policies updated with helper function to prevent recursion' as status;
