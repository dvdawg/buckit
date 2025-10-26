
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
    
    RAISE NOTICE 'Updated item %: satisfaction_rating = %, is_completed = %', p_item_id, p_satisfaction_rating, p_is_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION uncomplete_item(p_item_id UUID)
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
    
    -- Update the item to uncomplete it
    UPDATE items 
    SET 
        satisfaction_rating = NULL,
        is_completed = FALSE,
        completed_at = NULL
    WHERE id = p_item_id;
    
    -- Update bucket progress
    PERFORM update_bucket_progress(
        (SELECT bucket_id FROM items WHERE id = p_item_id),
        user_db_id
    );
    
    RAISE NOTICE 'Uncompleted item %', p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "items_update_own_only" ON items;
DROP POLICY IF EXISTS "Users can update their own items" ON items;
DROP POLICY IF EXISTS "items_update_auth" ON items;
DROP POLICY IF EXISTS "items_update_own" ON items;

CREATE POLICY "items_update_authenticated" ON items
    FOR UPDATE USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION test_satisfaction_rating_update()
RETURNS TEXT AS $$
DECLARE
    test_item_id UUID;
    auth_uid UUID;
    user_db_id UUID;
    result TEXT;
BEGIN
    -- Get current user
    auth_uid := auth.uid();
    IF auth_uid IS NULL THEN
        RETURN 'No authenticated user';
    END IF;
    
    -- Get user's database ID
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    IF user_db_id IS NULL THEN
        RETURN 'User not found in database';
    END IF;
    
    -- Get a test item
    SELECT id INTO test_item_id FROM items WHERE owner_id = user_db_id LIMIT 1;
    IF test_item_id IS NULL THEN
        RETURN 'No items found for user';
    END IF;
    
    -- Test the update function
    BEGIN
        PERFORM update_item_satisfaction_rating(test_item_id, 5, TRUE);
        result := 'Success: Updated item ' || test_item_id || ' with rating 5';
    EXCEPTION WHEN OTHERS THEN
        result := 'Error: ' || SQLERRM;
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
