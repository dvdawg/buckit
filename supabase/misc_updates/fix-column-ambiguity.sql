-- Fix column ambiguity issue in RPC functions
-- The problem is naming conflict between function parameters and table columns

-- 1. Fix the debug function with proper column qualification
CREATE OR REPLACE FUNCTION debug_get_user_buckets(p_user_id UUID)
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
DECLARE
    bucket_count INTEGER;
BEGIN
    -- Count total buckets for this user (use table alias to avoid ambiguity)
    SELECT COUNT(*) INTO bucket_count FROM buckets b WHERE b.owner_id = p_user_id;
    RAISE NOTICE 'debug_get_user_buckets: found % buckets for user %', bucket_count, p_user_id;
    
    -- Return only buckets owned by the specified user
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
    WHERE b.owner_id = p_user_id
    ORDER BY b.created_at DESC;
END;
$$;

-- 2. Fix the main RPC functions with proper column qualification
CREATE OR REPLACE FUNCTION get_user_buckets_secure()
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
DECLARE
    auth_uid UUID;
    p_user_id UUID;
    bucket_count INTEGER;
BEGIN
    -- Get auth.uid() directly first
    auth_uid := auth.uid();
    RAISE NOTICE 'get_user_buckets_secure: auth_uid = %', auth_uid;
    
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated - no auth.uid()';
    END IF;
    
    -- Get user's database ID (use table alias to avoid ambiguity)
    SELECT u.id INTO p_user_id FROM users u WHERE u.auth_id = auth_uid LIMIT 1;
    RAISE NOTICE 'get_user_buckets_secure: p_user_id = %', p_user_id;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found in database for auth_uid: %', auth_uid;
    END IF;
    
    -- Count total buckets for this user (use table alias to avoid ambiguity)
    SELECT COUNT(*) INTO bucket_count FROM buckets b WHERE b.owner_id = p_user_id;
    RAISE NOTICE 'get_user_buckets_secure: found % buckets for user %', bucket_count, p_user_id;
    
    -- Return only buckets owned by the current user
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
    WHERE b.owner_id = p_user_id
    ORDER BY b.created_at DESC;
END;
$$;

-- 3. Fix the items RPC function as well
CREATE OR REPLACE FUNCTION get_user_items_secure()
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
DECLARE
    auth_uid UUID;
    p_user_id UUID;
BEGIN
    -- Get auth.uid() directly first
    auth_uid := auth.uid();
    
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated - no auth.uid()';
    END IF;
    
    -- Get user's database ID (use table alias to avoid ambiguity)
    SELECT u.id INTO p_user_id FROM users u WHERE u.auth_id = auth_uid LIMIT 1;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found in database for auth_uid: %', auth_uid;
    END IF;
    
    -- Return only items owned by the current user
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
    WHERE i.owner_id = p_user_id
    ORDER BY i.created_at DESC;
END;
$$;

-- 4. Test the debug function with proper parameter naming
SELECT 'Testing debug function with first user ID:' as info;

DO $$
DECLARE
    first_user_id UUID;
    bucket_count INTEGER;
BEGIN
    -- Get the first user ID
    SELECT u.id INTO first_user_id FROM users u LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user ID: %', first_user_id;
        
        -- Count buckets for this user
        SELECT COUNT(*) INTO bucket_count FROM buckets b WHERE b.owner_id = first_user_id;
        RAISE NOTICE 'User % has % buckets', first_user_id, bucket_count;
        
        -- Test the debug function
        PERFORM * FROM debug_get_user_buckets(first_user_id);
    ELSE
        RAISE NOTICE 'No users found in database';
    END IF;
END;
$$;

-- 5. Show all users and their bucket counts
SELECT 'Users and their bucket counts:' as info;
SELECT 
    u.id as user_id,
    u.full_name,
    u.handle,
    COUNT(b.id) as bucket_count
FROM users u
LEFT JOIN buckets b ON u.id = b.owner_id
GROUP BY u.id, u.full_name, u.handle
ORDER BY bucket_count DESC;

-- 6. Clean up debug function
DROP FUNCTION IF EXISTS debug_get_user_buckets(UUID);

SELECT 'Column ambiguity issues fixed - RPC functions should now work correctly' as status;
