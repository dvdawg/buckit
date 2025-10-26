
CREATE OR REPLACE FUNCTION send_friend_request(p_friend_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := me_user_id();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF current_user_id = p_friend_id THEN
        RAISE EXCEPTION 'Cannot friend yourself';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM friendships f
        WHERE (f.user_id = current_user_id AND f.friend_id = p_friend_id)
        OR (f.user_id = p_friend_id AND f.friend_id = current_user_id)
    ) THEN
        RAISE EXCEPTION 'Friendship already exists';
    END IF;
    
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (current_user_id, p_friend_id, 'pending');
    
    RETURN TRUE;
END;
$$;
