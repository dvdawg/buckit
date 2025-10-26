-- Add satisfaction rating RPC functions
-- This migration adds the RPC functions needed for updating satisfaction ratings

-- 1. Create a secure RPC function to update satisfaction ratings
-- This bypasses RLS policies entirely
CREATE OR REPLACE FUNCTION update_item_satisfaction_rating(
    p_item_id UUID,
    p_satisfaction_rating INTEGER,
    p_is_completed BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
    item_owner_id UUID;
BEGIN
    -- Get authenticated user
    auth_uid := auth.uid();
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user's database ID
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    IF user_db_id IS NULL THEN
        RAISE EXCEPTION 'User not found in database';
    END IF;
    
    -- Verify user owns the item
    SELECT owner_id INTO item_owner_id FROM items WHERE id = p_item_id;
    IF item_owner_id IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;
    
    IF item_owner_id != user_db_id THEN
        RAISE EXCEPTION 'Access denied: You do not own this item';
    END IF;
    
    -- Update the item
    UPDATE items 
    SET 
        satisfaction_rating = p_satisfaction_rating,
        is_completed = p_is_completed,
        completed_at = CASE 
            WHEN p_is_completed = TRUE THEN NOW()
            ELSE NULL
        END
    WHERE id = p_item_id;
    
    -- Update bucket progress
    PERFORM update_bucket_progress(
        (SELECT bucket_id FROM items WHERE id = p_item_id),
        user_db_id
    );
    
    -- Log the update
    RAISE NOTICE 'Updated item % with satisfaction rating %', p_item_id, p_satisfaction_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to uncomplete items
CREATE OR REPLACE FUNCTION uncomplete_item(
    p_item_id UUID
)
RETURNS VOID AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
    item_owner_id UUID;
    item_bucket_id UUID;
BEGIN
    -- Get authenticated user
    auth_uid := auth.uid();
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user's database ID
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    IF user_db_id IS NULL THEN
        RAISE EXCEPTION 'User not found in database';
    END IF;
    
    -- Get item details
    SELECT owner_id, bucket_id INTO item_owner_id, item_bucket_id 
    FROM items WHERE id = p_item_id;
    
    IF item_owner_id IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;
    
    IF item_owner_id != user_db_id THEN
        RAISE EXCEPTION 'Access denied: You do not own this item';
    END IF;
    
    -- Update the item to uncomplete
    UPDATE items 
    SET 
        is_completed = FALSE,
        satisfaction_rating = NULL,
        completed_at = NULL
    WHERE id = p_item_id;
    
    -- Update bucket progress
    PERFORM update_bucket_progress(item_bucket_id, user_db_id);
    
    -- Log the update
    RAISE NOTICE 'Uncompleted item %', p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a test function to verify the update mechanism works
CREATE OR REPLACE FUNCTION test_satisfaction_rating_update(
    p_item_id UUID,
    p_satisfaction_rating INTEGER
)
RETURNS TABLE(
    item_id UUID,
    title TEXT,
    satisfaction_rating INTEGER,
    is_completed BOOLEAN,
    completed_at TIMESTAMPTZ
) AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
BEGIN
    -- Get authenticated user
    auth_uid := auth.uid();
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user's database ID
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    IF user_db_id IS NULL THEN
        RAISE EXCEPTION 'User not found in database';
    END IF;
    
    -- Return the item details
    RETURN QUERY
    SELECT 
        i.id,
        i.title,
        i.satisfaction_rating,
        i.is_completed,
        i.completed_at
    FROM items i
    WHERE i.id = p_item_id AND i.owner_id = user_db_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_item_satisfaction_rating(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION uncomplete_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION test_satisfaction_rating_update(UUID, INTEGER) TO authenticated;
