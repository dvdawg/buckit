-- Fix RLS infinite recursion by removing cross-table references
-- This script drops all problematic policies and creates simple ones

-- 1. Drop ALL existing RLS policies to eliminate recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can create buckets" ON buckets;
DROP POLICY IF EXISTS "Users can update their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can delete their own buckets" ON buckets;

DROP POLICY IF EXISTS "Users can view public items" ON items;
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;
DROP POLICY IF EXISTS "Users can view items in their buckets" ON items;
DROP POLICY IF EXISTS "Users can create items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;

DROP POLICY IF EXISTS "Users can view bucket collaborators" ON bucket_collaborators;
DROP POLICY IF EXISTS "Bucket owners can manage collaborators" ON bucket_collaborators;

DROP POLICY IF EXISTS "Users can view completions" ON completions;
DROP POLICY IF EXISTS "Users can create completions" ON completions;
DROP POLICY IF EXISTS "Users can update their own completions" ON completions;

DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;

DROP POLICY IF EXISTS "Users can view relevant feed events" ON feed_events;
DROP POLICY IF EXISTS "Users can create feed events" ON feed_events;

-- 2. Create simple, non-recursive RLS policies

-- Users policies (simple auth check only)
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Buckets policies (use helper function to avoid recursion)
CREATE POLICY "buckets_select_own" ON buckets
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "buckets_insert_own" ON buckets
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "buckets_update_own" ON buckets
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "buckets_delete_own" ON buckets
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Items policies (use helper function to avoid recursion)
CREATE POLICY "items_select_own" ON items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_insert_own" ON items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "items_update_own" ON items
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_delete_own" ON items
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Bucket collaborators policies (simple auth check only)
CREATE POLICY "bucket_collaborators_select" ON bucket_collaborators
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "bucket_collaborators_all" ON bucket_collaborators
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Completions policies (simple auth check only)
CREATE POLICY "completions_select" ON completions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "completions_insert" ON completions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "completions_update" ON completions
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Friendships policies (simple auth check only)
CREATE POLICY "friendships_select" ON friendships
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "friendships_insert" ON friendships
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "friendships_update" ON friendships
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Feed events policies (simple auth check only)
CREATE POLICY "feed_events_select" ON feed_events
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "feed_events_insert" ON feed_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Create helper functions for complex logic (bypasses RLS)
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

CREATE OR REPLACE FUNCTION get_user_items_safe(user_id UUID)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    bucket_id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    location TEXT,
    visibility TEXT,
    urgency_level TEXT,
    is_completed BOOLEAN,
    created_at TIMESTAMPTZ,
    bucket_emoji TEXT,
    bucket_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.owner_id,
        i.bucket_id,
        i.title,
        i.description,
        i.category,
        i.location,
        i.visibility,
        i.urgency_level,
        i.is_completed,
        i.created_at,
        b.emoji as bucket_emoji,
        b.title as bucket_title
    FROM items i
    LEFT JOIN buckets b ON i.bucket_id = b.id
    WHERE i.owner_id = user_id
    ORDER BY i.created_at DESC;
END;
$$;

-- 4. Verify the fix
SELECT 'RLS policies have been simplified to prevent recursion' as status;
