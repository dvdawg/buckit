-- Fix ambiguous column references in friend system functions

-- Fix accept_friend_request function
CREATE OR REPLACE FUNCTION accept_friend_request(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    friendship_exists BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if the friendship exists
    SELECT EXISTS(
        SELECT 1 FROM friendships f
        WHERE f.user_id = p_user_id 
        AND f.friend_id = current_user_id 
        AND f.status = 'pending'
    ) INTO friendship_exists;
    
    IF NOT friendship_exists THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    -- Update the friendship status
    UPDATE friendships f
    SET status = 'accepted'
    WHERE f.user_id = p_user_id 
    AND f.friend_id = current_user_id 
    AND f.status = 'pending';
    
    RETURN TRUE;
END;
$$;

-- Fix reject_friend_request function
CREATE OR REPLACE FUNCTION reject_friend_request(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    friendship_exists BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if the friendship exists
    SELECT EXISTS(
        SELECT 1 FROM friendships f
        WHERE f.user_id = p_user_id 
        AND f.friend_id = current_user_id 
        AND f.status = 'pending'
    ) INTO friendship_exists;
    
    IF NOT friendship_exists THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    -- Update the friendship status
    UPDATE friendships f
    SET status = 'declined'
    WHERE f.user_id = p_user_id 
    AND f.friend_id = current_user_id 
    AND f.status = 'pending';
    
    RETURN TRUE;
END;
$$;
