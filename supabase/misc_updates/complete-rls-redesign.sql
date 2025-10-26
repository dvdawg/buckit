
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_progress DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_auth_only" ON users;

DROP POLICY IF EXISTS "buckets_select_own" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_own" ON buckets;
DROP POLICY IF EXISTS "buckets_update_own" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_own" ON buckets;
DROP POLICY IF EXISTS "buckets_select_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_update_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_select_own_only" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_own_only" ON buckets;
DROP POLICY IF EXISTS "buckets_update_own_only" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_own_only" ON buckets;
DROP POLICY IF EXISTS "buckets_auth_only" ON buckets;

DROP POLICY IF EXISTS "items_select_own" ON items;
DROP POLICY IF EXISTS "items_insert_own" ON items;
DROP POLICY IF EXISTS "items_update_own" ON items;
DROP POLICY IF EXISTS "items_delete_own" ON items;
DROP POLICY IF EXISTS "items_select_auth" ON items;
DROP POLICY IF EXISTS "items_insert_auth" ON items;
DROP POLICY IF EXISTS "items_update_auth" ON items;
DROP POLICY IF EXISTS "items_delete_auth" ON items;
DROP POLICY IF EXISTS "items_select_own_only" ON items;
DROP POLICY IF EXISTS "items_insert_own_only" ON items;
DROP POLICY IF EXISTS "items_update_own_only" ON items;
DROP POLICY IF EXISTS "items_delete_own_only" ON items;
DROP POLICY IF EXISTS "items_auth_only" ON items;

DROP POLICY IF EXISTS "bucket_collaborators_select" ON bucket_collaborators;
DROP POLICY IF EXISTS "bucket_collaborators_all" ON bucket_collaborators;
DROP POLICY IF EXISTS "bucket_collaborators_auth" ON bucket_collaborators;
DROP POLICY IF EXISTS "bucket_collaborators_auth_only" ON bucket_collaborators;

DROP POLICY IF EXISTS "completions_select" ON completions;
DROP POLICY IF EXISTS "completions_insert" ON completions;
DROP POLICY IF EXISTS "completions_update" ON completions;
DROP POLICY IF EXISTS "completions_auth" ON completions;
DROP POLICY IF EXISTS "completions_auth_only" ON completions;

DROP POLICY IF EXISTS "friendships_select" ON friendships;
DROP POLICY IF EXISTS "friendships_insert" ON friendships;
DROP POLICY IF EXISTS "friendships_update" ON friendships;
DROP POLICY IF EXISTS "friendships_auth" ON friendships;
DROP POLICY IF EXISTS "friendships_auth_only" ON friendships;

DROP POLICY IF EXISTS "feed_events_select" ON feed_events;
DROP POLICY IF EXISTS "feed_events_insert" ON feed_events;
DROP POLICY IF EXISTS "feed_events_auth" ON feed_events;
DROP POLICY IF EXISTS "feed_events_auth_only" ON feed_events;

DROP POLICY IF EXISTS "bucket_progress_auth_only" ON bucket_progress;
DROP POLICY IF EXISTS "performance_metrics_auth_only" ON performance_metrics;
DROP POLICY IF EXISTS "user_activity_auth_only" ON user_activity;
DROP POLICY IF EXISTS "weekly_progress_auth_only" ON weekly_progress;


CREATE OR REPLACE FUNCTION get_current_user_db_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
BEGIN
    -- Get the auth.uid() directly
    auth_uid := auth.uid();
    
    IF auth_uid IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get the user's database ID
    SELECT u.id INTO user_db_id FROM users u WHERE u.auth_id = auth_uid LIMIT 1;
    
    RETURN user_db_id;
END;
$$;


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
    p_user_id UUID;
BEGIN
    -- Get current user's database ID
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
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
    p_user_id UUID;
BEGIN
    -- Get current user's database ID
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
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

CREATE OR REPLACE FUNCTION create_bucket_secure(
    p_title TEXT,
    p_description TEXT,
    p_visibility TEXT DEFAULT 'private'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_user_id UUID;
    bucket_id UUID;
BEGIN
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    INSERT INTO buckets (owner_id, title, description, visibility, emoji, color)
    VALUES (p_user_id, p_title, p_description, p_visibility, '🪣', '#4ade80')
    RETURNING id INTO bucket_id;
    
    RETURN bucket_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_item_secure(
    p_bucket_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_user_id UUID;
    item_id UUID;
BEGIN
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    INSERT INTO items (bucket_id, owner_id, title, description, location_name, visibility, urgency_level)
    VALUES (p_bucket_id, p_user_id, p_title, p_description, p_location, 'private', 'no_rush')
    RETURNING id INTO item_id;
    
    RETURN item_id;
END;
$$;


ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_auth_check" ON users
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "buckets_auth_check" ON buckets
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_auth_check" ON items
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "bucket_collaborators_auth_check" ON bucket_collaborators
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "completions_auth_check" ON completions
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "friendships_auth_check" ON friendships
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "feed_events_auth_check" ON feed_events
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "bucket_progress_auth_check" ON bucket_progress
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "performance_metrics_auth_check" ON performance_metrics
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_activity_auth_check" ON user_activity
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "weekly_progress_auth_check" ON weekly_progress
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION me_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN get_current_user_db_id();
END;
$$;

SELECT 'Complete RLS redesign applied successfully' as status;
SELECT 'All data access should now go through secure RPC functions' as note;
SELECT 'RLS policies are minimal and only check authentication' as security_note;
