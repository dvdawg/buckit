
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;
DROP POLICY IF EXISTS "friendships_auth_check" ON friendships;

CREATE POLICY "friendships_auth_check" ON friendships
    FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION me_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT id INTO user_id FROM users WHERE auth_id = user_id;
    
    RETURN user_id;
END;
$$;

CREATE OR REPLACE FUNCTION accept_friend_request(p_user_id UUID)
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
        SELECT 1 FROM friendships 
        WHERE user_id = p_user_id 
        AND friend_id = current_user_id 
        AND status = 'pending'
    ) INTO friendship_exists;
    
    IF NOT friendship_exists THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    UPDATE friendships 
    SET status = 'accepted'
    WHERE user_id = p_user_id 
    AND friend_id = current_user_id 
    AND status = 'pending';
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION reject_friend_request(p_user_id UUID)
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
        SELECT 1 FROM friendships 
        WHERE user_id = p_user_id 
        AND friend_id = current_user_id 
        AND status = 'pending'
    ) INTO friendship_exists;
    
    IF NOT friendship_exists THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    UPDATE friendships 
    SET status = 'declined'
    WHERE user_id = p_user_id 
    AND friend_id = current_user_id 
    AND status = 'pending';
    
    RETURN TRUE;
END;
$$;
