-- Additional friend system functions

-- Function to reject friend request
CREATE OR REPLACE FUNCTION reject_friend_request(p_user_id UUID)
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
    SET status = 'declined'
    WHERE user_id = p_user_id AND friend_id = user_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to unfriend someone
CREATE OR REPLACE FUNCTION unfriend(p_friend_id UUID)
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
    
    DELETE FROM friendships 
    WHERE (user_id = user_id AND friend_id = p_friend_id)
    OR (user_id = p_friend_id AND friend_id = user_id);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friendship not found';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to get friend requests (both sent and received)
DROP FUNCTION IF EXISTS get_friend_requests();
CREATE OR REPLACE FUNCTION get_friend_requests()
RETURNS TABLE (
    id TEXT,
    user_id UUID,
    friend_id UUID,
    status TEXT,
    created_at TIMESTAMPTZ,
    user_info JSONB,
    friend_info JSONB
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        f.user_id::TEXT || '_' || f.friend_id::TEXT as id,
        f.user_id,
        f.friend_id,
        f.status,
        f.created_at,
        jsonb_build_object(
            'id', u1.id,
            'handle', u1.handle,
            'full_name', u1.full_name,
            'avatar_url', u1.avatar_url
        ) as user_info,
        jsonb_build_object(
            'id', u2.id,
            'handle', u2.handle,
            'full_name', u2.full_name,
            'avatar_url', u2.avatar_url
        ) as friend_info
    FROM friendships f
    JOIN users u1 ON u1.id = f.user_id
    JOIN users u2 ON u2.id = f.friend_id
    WHERE f.user_id = me_user_id() OR f.friend_id = me_user_id()
    ORDER BY f.created_at DESC;
$$;

-- Function to get friends list
CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE (
    id UUID,
    handle TEXT,
    full_name TEXT,
    avatar_url TEXT,
    points INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT DISTINCT
        u.id,
        u.handle,
        u.full_name,
        u.avatar_url,
        u.points,
        u.created_at
    FROM friendships f
    JOIN users u ON (
        (f.user_id = me_user_id() AND u.id = f.friend_id)
        OR (f.friend_id = me_user_id() AND u.id = f.user_id)
    )
    WHERE f.status = 'accepted'
    ORDER BY u.full_name;
$$;

-- Function to search users by username/handle
CREATE OR REPLACE FUNCTION search_users(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    handle TEXT,
    full_name TEXT,
    avatar_url TEXT,
    points INTEGER,
    is_friend BOOLEAN,
    friendship_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        u.id,
        u.handle,
        u.full_name,
        u.avatar_url,
        u.points,
        CASE 
            WHEN f.status = 'accepted' THEN TRUE
            ELSE FALSE
        END as is_friend,
        COALESCE(f.status, 'none') as friendship_status
    FROM users u
    LEFT JOIN friendships f ON (
        (f.user_id = me_user_id() AND f.friend_id = u.id)
        OR (f.user_id = u.id AND f.friend_id = me_user_id())
    )
    WHERE u.id != me_user_id()
    AND (
        u.handle ILIKE '%' || search_term || '%'
        OR u.full_name ILIKE '%' || search_term || '%'
    )
    ORDER BY 
        CASE WHEN f.status = 'accepted' THEN 1 ELSE 2 END,
        u.points DESC
    LIMIT limit_count;
$$;

-- Function to get friend count
CREATE OR REPLACE FUNCTION get_friend_count()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM friendships f
    WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
    AND f.status = 'accepted';
$$;

-- Function to check friendship status with another user
CREATE OR REPLACE FUNCTION get_friendship_status(p_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT status FROM friendships 
         WHERE (user_id = me_user_id() AND friend_id = p_user_id)
         OR (user_id = p_user_id AND friend_id = me_user_id())
         LIMIT 1),
        'none'
    );
$$;

-- Function to get user profile by handle
CREATE OR REPLACE FUNCTION get_user_by_handle(p_handle TEXT)
RETURNS TABLE (
    id UUID,
    handle TEXT,
    full_name TEXT,
    avatar_url TEXT,
    points INTEGER,
    location TEXT,
    created_at TIMESTAMPTZ,
    is_friend BOOLEAN,
    friendship_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        u.id,
        u.handle,
        u.full_name,
        u.avatar_url,
        u.points,
        u.location,
        u.created_at,
        CASE 
            WHEN f.status = 'accepted' THEN TRUE
            ELSE FALSE
        END as is_friend,
        COALESCE(f.status, 'none') as friendship_status
    FROM users u
    LEFT JOIN friendships f ON (
        (f.user_id = me_user_id() AND f.friend_id = u.id)
        OR (f.user_id = u.id AND f.friend_id = me_user_id())
    )
    WHERE u.handle = p_handle;
$$;
