-- Update create_item_secure function to support deadline
CREATE OR REPLACE FUNCTION create_item_secure(
    p_bucket_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_deadline DATE DEFAULT NULL
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
    
    INSERT INTO items (bucket_id, owner_id, title, description, location_name, deadline, visibility, urgency_level)
    VALUES (p_bucket_id, p_user_id, p_title, p_description, p_location, p_deadline, 'private', 'no_rush')
    RETURNING id INTO item_id;
    
    RETURN item_id;
END;
$$;
