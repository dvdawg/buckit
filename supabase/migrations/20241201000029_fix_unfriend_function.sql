
CREATE OR REPLACE FUNCTION unfriend(p_friend_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    friendship_exists BOOLEAN;
BEGIN
    current_user_id := me_user_id();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM friendships f
        WHERE (f.user_id = current_user_id AND f.friend_id = p_friend_id)
        OR (f.user_id = p_friend_id AND f.friend_id = current_user_id)
    ) INTO friendship_exists;
    
    IF NOT friendship_exists THEN
        RAISE EXCEPTION 'Friendship not found';
    END IF;
    
    DELETE FROM friendships f
    WHERE (f.user_id = current_user_id AND f.friend_id = p_friend_id)
    OR (f.user_id = p_friend_id AND f.friend_id = current_user_id);
    
    RETURN TRUE;
END;
$$;
