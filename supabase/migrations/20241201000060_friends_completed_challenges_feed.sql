-- Create function to get friends' completed challenges for the home feed
-- This function returns completed challenges from friends, sorted by completion time

CREATE OR REPLACE FUNCTION get_friends_completed_challenges(
    limit_rows INTEGER DEFAULT 20,
    offset_rows INTEGER DEFAULT 0
)
RETURNS TABLE (
    completion_id UUID,
    item_id UUID,
    item_title TEXT,
    item_description TEXT,
    item_location_name TEXT,
    bucket_id UUID,
    bucket_title TEXT,
    bucket_emoji TEXT,
    bucket_color TEXT,
    completed_by_user_id UUID,
    completed_by_name TEXT,
    completed_by_handle TEXT,
    completed_by_avatar TEXT,
    completion_photo_url TEXT,
    completion_caption TEXT,
    satisfaction_rating INTEGER,
    completed_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        c.id as completion_id,
        i.id as item_id,
        i.title as item_title,
        i.description as item_description,
        i.location_name as item_location_name,
        b.id as bucket_id,
        b.title as bucket_title,
        b.emoji as bucket_emoji,
        b.color as bucket_color,
        u.id as completed_by_user_id,
        u.full_name as completed_by_name,
        u.handle as completed_by_handle,
        u.avatar_url as completed_by_avatar,
        c.photo_url as completion_photo_url,
        c.caption as completion_caption,
        i.satisfaction_rating,
        c.created_at as completed_at
    FROM completions c
    JOIN items i ON i.id = c.item_id
    JOIN buckets b ON b.id = i.bucket_id
    JOIN users u ON u.id = c.user_id
    WHERE 
        -- Only show completions from friends
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = c.user_id OR f.friend_id = c.user_id)
        )
        -- Only show completed items (not just any completion)
        AND i.is_completed = TRUE
        -- Only show items from buckets that are friends visibility or public
        AND (b.visibility = 'friends' OR b.visibility = 'public')
        -- Don't show user's own completions
        AND c.user_id != me_user_id()
    ORDER BY c.created_at DESC
    LIMIT limit_rows
    OFFSET offset_rows;
$$;

-- Create function to get friends' completed challenges count
CREATE OR REPLACE FUNCTION get_friends_completed_challenges_count()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COUNT(*)
    FROM completions c
    JOIN items i ON i.id = c.item_id
    JOIN buckets b ON b.id = i.bucket_id
    WHERE 
        -- Only show completions from friends
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = c.user_id OR f.friend_id = c.user_id)
        )
        -- Only show completed items (not just any completion)
        AND i.is_completed = TRUE
        -- Only show items from buckets that are friends visibility or public
        AND (b.visibility = 'friends' OR b.visibility = 'public')
        -- Don't show user's own completions
        AND c.user_id != me_user_id();
$$;
