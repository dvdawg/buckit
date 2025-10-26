-- Fix get_friends function to prevent duplicate results
-- The original function had a CASE statement in the JOIN that could cause duplicates

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
