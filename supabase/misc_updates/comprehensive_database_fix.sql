-- Comprehensive database fix for missing functions
-- Run this SQL in your Supabase SQL editor to fix all missing functions

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS update_item_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_item_satisfaction_rating(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS uncomplete_item(UUID);

-- 1. Fix update_item_secure function
CREATE OR REPLACE FUNCTION update_item_secure(
    p_item_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_location_name TEXT DEFAULT NULL,
    p_location_point TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_user_id UUID;
    location_geography GEOGRAPHY(POINT, 4326);
    update_count INTEGER;
BEGIN
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Convert location_point string to geography if provided
    IF p_location_point IS NOT NULL THEN
        BEGIN
            location_geography := ST_GeogFromText(p_location_point);
        EXCEPTION WHEN OTHERS THEN
            -- If parsing fails, set to NULL and continue
            location_geography := NULL;
        END;
    END IF;
    
    -- Update only the fields that are provided (not NULL)
    UPDATE items 
    SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        location_name = COALESCE(p_location_name, location_name),
        location_point = CASE 
            WHEN p_location_point IS NOT NULL THEN location_geography
            ELSE location_point
        END
    WHERE id = p_item_id AND owner_id = p_user_id
    RETURNING 1 INTO update_count;
    
    RETURN update_count > 0;
END;
$$;

-- 2. Ensure update_item_satisfaction_rating function exists
CREATE OR REPLACE FUNCTION update_item_satisfaction_rating(
    p_item_id UUID,
    p_satisfaction_rating INTEGER,
    p_is_completed BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_user_id UUID;
    update_count INTEGER;
BEGIN
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Validate rating
    IF p_satisfaction_rating < 1 OR p_satisfaction_rating > 5 THEN
        RAISE EXCEPTION 'Satisfaction rating must be between 1 and 5';
    END IF;
    
    -- Update the item
    UPDATE items 
    SET 
        satisfaction_rating = p_satisfaction_rating,
        is_completed = p_is_completed,
        completed_at = CASE 
            WHEN p_is_completed AND completed_at IS NULL THEN NOW()
            WHEN NOT p_is_completed THEN NULL
            ELSE completed_at
        END
    WHERE id = p_item_id AND owner_id = p_user_id
    RETURNING 1 INTO update_count;
    
    RETURN update_count > 0;
END;
$$;

-- 3. Ensure uncomplete_item function exists
CREATE OR REPLACE FUNCTION uncomplete_item(p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_user_id UUID;
    update_count INTEGER;
BEGIN
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Uncomplete the item
    UPDATE items 
    SET 
        is_completed = FALSE,
        satisfaction_rating = NULL,
        completed_at = NULL
    WHERE id = p_item_id AND owner_id = p_user_id
    RETURNING 1 INTO update_count;
    
    RETURN update_count > 0;
END;
$$;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_item_secure(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_item_satisfaction_rating(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION uncomplete_item(UUID) TO authenticated;
