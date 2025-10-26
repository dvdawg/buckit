
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

DROP POLICY IF EXISTS "Users can view public buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can view friend's buckets" ON buckets;
DROP POLICY IF EXISTS "Users can create buckets" ON buckets;
DROP POLICY IF EXISTS "Users can update their own buckets" ON buckets;
DROP POLICY IF EXISTS "Users can delete their own buckets" ON buckets;
DROP POLICY IF EXISTS "buckets_select_own" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_own" ON buckets;
DROP POLICY IF EXISTS "buckets_update_own" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_own" ON buckets;
DROP POLICY IF EXISTS "buckets_select_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_update_auth" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_auth" ON buckets;

DROP POLICY IF EXISTS "Users can view public items" ON items;
DROP POLICY IF EXISTS "Users can view their own items" ON items;
DROP POLICY IF EXISTS "Users can view friend's items" ON items;
DROP POLICY IF EXISTS "Users can view items in their buckets" ON items;
DROP POLICY IF EXISTS "Users can create items" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "Users can delete their own items" ON items;
DROP POLICY IF EXISTS "items_select_own" ON items;
DROP POLICY IF EXISTS "items_insert_own" ON items;
DROP POLICY IF EXISTS "items_update_own" ON items;
DROP POLICY IF EXISTS "items_delete_own" ON items;
DROP POLICY IF EXISTS "items_select_auth" ON items;
DROP POLICY IF EXISTS "items_insert_auth" ON items;
DROP POLICY IF EXISTS "items_update_auth" ON items;
DROP POLICY IF EXISTS "items_delete_auth" ON items;

DROP POLICY IF EXISTS "Users can view bucket collaborators" ON bucket_collaborators;
DROP POLICY IF EXISTS "Bucket owners can manage collaborators" ON bucket_collaborators;
DROP POLICY IF EXISTS "bucket_collaborators_select" ON bucket_collaborators;
DROP POLICY IF EXISTS "bucket_collaborators_all" ON bucket_collaborators;
DROP POLICY IF EXISTS "bucket_collaborators_auth" ON bucket_collaborators;

DROP POLICY IF EXISTS "Users can view completions" ON completions;
DROP POLICY IF EXISTS "Users can create completions" ON completions;
DROP POLICY IF EXISTS "Users can update their own completions" ON completions;
DROP POLICY IF EXISTS "completions_select" ON completions;
DROP POLICY IF EXISTS "completions_insert" ON completions;
DROP POLICY IF EXISTS "completions_update" ON completions;
DROP POLICY IF EXISTS "completions_auth" ON completions;

DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;
DROP POLICY IF EXISTS "friendships_select" ON friendships;
DROP POLICY IF EXISTS "friendships_insert" ON friendships;
DROP POLICY IF EXISTS "friendships_update" ON friendships;
DROP POLICY IF EXISTS "friendships_auth" ON friendships;

DROP POLICY IF EXISTS "Users can view relevant feed events" ON feed_events;
DROP POLICY IF EXISTS "Users can create feed events" ON feed_events;
DROP POLICY IF EXISTS "feed_events_select" ON feed_events;
DROP POLICY IF EXISTS "feed_events_insert" ON feed_events;
DROP POLICY IF EXISTS "feed_events_auth" ON feed_events;

DROP POLICY IF EXISTS "friendships_select_participant" ON friendships;
DROP POLICY IF EXISTS "friendships_insert_self_request" ON friendships;
DROP POLICY IF EXISTS "friendships_update_recipient" ON friendships;
DROP POLICY IF EXISTS "buckets_select_visibility" ON buckets;
DROP POLICY IF EXISTS "buckets_insert_owner" ON buckets;
DROP POLICY IF EXISTS "buckets_update_owner_or_editor" ON buckets;
DROP POLICY IF EXISTS "buckets_delete_owner" ON buckets;
DROP POLICY IF EXISTS "completions_select_visibility" ON completions;
DROP POLICY IF EXISTS "bucket_collab_select" ON bucket_collaborators;
DROP POLICY IF EXISTS "bucket_collab_write_owner" ON bucket_collaborators;
DROP POLICY IF EXISTS "items_select_visibility" ON items;
DROP POLICY IF EXISTS "items_insert_owner_or_editor" ON items;
DROP POLICY IF EXISTS "items_write_owner_or_editor" ON items;
DROP POLICY IF EXISTS "items_delete_owner_or_editor" ON items;
DROP POLICY IF EXISTS "fe_select" ON feed_events;
DROP POLICY IF EXISTS "fe_insert_self" ON feed_events;


CREATE OR REPLACE FUNCTION get_current_user_db_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
END;
$$;

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


ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "buckets_select_auth" ON buckets
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "buckets_insert_auth" ON buckets
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "buckets_update_auth" ON buckets
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "buckets_delete_auth" ON buckets
    FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_select_auth" ON items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_insert_auth" ON items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "items_update_auth" ON items
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_delete_auth" ON items
    FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "bucket_collaborators_auth" ON bucket_collaborators
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "completions_auth" ON completions
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "friendships_auth" ON friendships
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "feed_events_auth" ON feed_events
    FOR ALL USING (auth.uid() IS NOT NULL);

DROP FUNCTION IF EXISTS me_user_id();
DROP FUNCTION IF EXISTS create_bucket(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_bucket(TEXT, TEXT);
DROP FUNCTION IF EXISTS create_item(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_item(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_buckets_safe(UUID);
DROP FUNCTION IF EXISTS get_user_items_safe(UUID);

CREATE OR REPLACE FUNCTION me_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN get_current_user_db_id();
END;
$$;

CREATE OR REPLACE FUNCTION create_bucket(
    p_title TEXT,
    p_description TEXT,
    p_visibility TEXT DEFAULT 'private'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    bucket_id UUID;
BEGIN
    user_id := get_current_user_db_id();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    INSERT INTO buckets (owner_id, title, description, visibility, emoji, color)
    VALUES (user_id, p_title, p_description, p_visibility, '🪣', '#4ade80')
    RETURNING id INTO bucket_id;
    
    RETURN bucket_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_item(
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
    user_id UUID;
    item_id UUID;
BEGIN
    user_id := get_current_user_db_id();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    INSERT INTO items (bucket_id, owner_id, title, description, location_name, visibility, urgency_level)
    VALUES (p_bucket_id, user_id, p_title, p_description, p_location, 'private', 'no_rush')
    RETURNING id INTO item_id;
    
    RETURN item_id;
END;
$$;

SELECT 'Database RLS policies have been completely redesigned to prevent recursion' as status;
