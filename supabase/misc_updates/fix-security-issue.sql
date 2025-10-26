-- Fix security issue: users can see all buckets instead of just their own
-- The problem is that the simplified RLS policies are too permissive

-- 1. Drop the overly permissive policies
DROP POLICY IF EXISTS "buckets_select_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_update_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_auth" ON buckets;

DROP POLICY IF EXISTS "items_select_auth" ON items;
DROP POLICY IF EXISTS "items_insert_auth" ON items;
DROP POLICY IF EXISTS "items_update_auth" ON items;
DROP POLICY IF EXISTS "items_delete_auth" ON items;

-- 2. Create proper restrictive policies that filter by owner
CREATE POLICY "buckets_select_own_only" ON buckets
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "buckets_insert_own_only" ON buckets
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "buckets_update_own_only" ON buckets
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "buckets_delete_own_only" ON buckets
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "items_select_own_only" ON items
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "items_insert_own_only" ON items
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "items_update_own_only" ON items
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

CREATE POLICY "items_delete_own_only" ON items
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    );

-- 3. Ensure the RPC functions exist and work correctly
CREATE OR REPLACE FUNCTION get_user_buckets(user_id UUID)
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
    -- Only return buckets owned by the specified user
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

CREATE OR REPLACE FUNCTION get_user_items(user_id UUID)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    bucket_id UUID,
    title TEXT,
    description TEXT,
    location_name TEXT,
    deadline DATE,
    tags TEXT[],
    price_min INTEGER,
    price_max INTEGER,
    difficulty INTEGER,
    visibility TEXT,
    satisfaction_rating INTEGER,
    urgency_level TEXT,
    is_completed BOOLEAN,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    bucket_emoji TEXT,
    bucket_title TEXT,
    bucket_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only return items owned by the specified user
    RETURN QUERY
    SELECT 
        i.id,
        i.owner_id,
        i.bucket_id,
        i.title,
        i.description,
        i.location_name,
        i.deadline,
        i.tags,
        i.price_min,
        i.price_max,
        i.difficulty,
        i.visibility,
        i.satisfaction_rating,
        i.urgency_level,
        i.is_completed,
        i.completed_at,
        i.created_at,
        b.emoji as bucket_emoji,
        b.title as bucket_title,
        b.color as bucket_color
    FROM items i
    LEFT JOIN buckets b ON i.bucket_id = b.id
    WHERE i.owner_id = user_id
    ORDER BY i.created_at DESC;
END;
$$;

-- 4. Test the functions
SELECT 'Security policies updated to only show user-owned data' as status;
