-- Function to get current user's ID
CREATE OR REPLACE FUNCTION me_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT id FROM users WHERE auth_id = auth.uid();
$$;

-- Function to get home feed events
CREATE OR REPLACE FUNCTION home_feed(limit_rows INTEGER DEFAULT 30, offset_rows INTEGER DEFAULT 0)
RETURNS TABLE (
    id BIGINT,
    actor_id UUID,
    verb TEXT,
    object_type TEXT,
    object_id UUID,
    audience TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        fe.id,
        fe.actor_id,
        fe.verb,
        fe.object_type,
        fe.object_id,
        fe.audience,
        fe.created_at
    FROM feed_events fe
    WHERE 
        fe.actor_id = me_user_id()
        OR fe.audience = 'public'
        OR (fe.audience = 'friends' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (fe.actor_id = f.user_id OR fe.actor_id = f.friend_id)
        ))
    ORDER BY fe.created_at DESC
    LIMIT limit_rows
    OFFSET offset_rows;
$$;

-- Function to create a bucket
CREATE OR REPLACE FUNCTION create_bucket(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_visibility TEXT DEFAULT 'private'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_id UUID;
    user_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    INSERT INTO buckets (owner_id, title, description, visibility)
    VALUES (user_id, p_title, p_description, p_visibility)
    RETURNING id INTO bucket_id;
    
    -- Create feed event
    INSERT INTO feed_events (actor_id, verb, object_type, object_id, audience)
    VALUES (user_id, 'created', 'bucket', bucket_id, p_visibility);
    
    RETURN bucket_id;
END;
$$;

-- Function to create an item
CREATE OR REPLACE FUNCTION create_item(
    p_bucket_id UUID,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_id UUID;
    user_id UUID;
    bucket_owner_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user owns the bucket or is a collaborator
    SELECT owner_id INTO bucket_owner_id FROM buckets WHERE id = p_bucket_id;
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != user_id AND NOT EXISTS (
        SELECT 1 FROM bucket_collaborators 
        WHERE bucket_id = p_bucket_id AND user_id = user_id
    ) THEN
        RAISE EXCEPTION 'Not authorized to add items to this bucket';
    END IF;
    
    INSERT INTO items (bucket_id, owner_id, title, description, url)
    VALUES (p_bucket_id, user_id, p_title, p_description, p_url)
    RETURNING id INTO item_id;
    
    -- Create feed event
    INSERT INTO feed_events (actor_id, verb, object_type, object_id, audience)
    VALUES (user_id, 'created', 'item', item_id, 'friends');
    
    RETURN item_id;
END;
$$;

-- Function to complete an item
CREATE OR REPLACE FUNCTION complete_item(
    p_item_id UUID,
    p_photo_url TEXT DEFAULT NULL,
    p_caption TEXT DEFAULT NULL,
    p_tagged_friend_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    completion_id UUID;
    user_id UUID;
    item_owner_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if item exists and user has access
    SELECT owner_id INTO item_owner_id FROM items WHERE id = p_item_id;
    IF item_owner_id IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;
    
    -- Check if user can complete this item (owner or collaborator)
    IF item_owner_id != user_id AND NOT EXISTS (
        SELECT 1 FROM buckets b
        JOIN bucket_collaborators bc ON bc.bucket_id = b.id
        WHERE b.id = (SELECT bucket_id FROM items WHERE id = p_item_id)
        AND bc.user_id = user_id
    ) THEN
        RAISE EXCEPTION 'Not authorized to complete this item';
    END IF;
    
    INSERT INTO completions (item_id, user_id, photo_url, caption, tagged_friend_ids)
    VALUES (p_item_id, user_id, p_photo_url, p_caption, p_tagged_friend_ids)
    RETURNING id INTO completion_id;
    
    -- Create feed event
    INSERT INTO feed_events (actor_id, verb, object_type, object_id, audience)
    VALUES (user_id, 'completed', 'item', p_item_id, 'friends');
    
    -- Award points
    UPDATE users SET points = points + 10 WHERE id = user_id;
    
    RETURN completion_id;
END;
$$;

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(p_friend_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF user_id = p_friend_id THEN
        RAISE EXCEPTION 'Cannot friend yourself';
    END IF;
    
    -- Check if friendship already exists
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE (user_id = user_id AND friend_id = p_friend_id)
        OR (user_id = p_friend_id AND friend_id = user_id)
    ) THEN
        RAISE EXCEPTION 'Friendship already exists';
    END IF;
    
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (user_id, p_friend_id, 'pending');
    
    RETURN TRUE;
END;
$$;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    UPDATE friendships 
    SET status = 'accepted'
    WHERE user_id = p_user_id AND friend_id = user_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found';
    END IF;
    
    RETURN TRUE;
END;
$$;
