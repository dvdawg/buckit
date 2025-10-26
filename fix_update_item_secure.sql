-- Manual fix for update_item_secure function
-- Run this SQL in your Supabase SQL editor to fix the missing function

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
