
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
    
    IF p_location_point IS NOT NULL THEN
        BEGIN
            location_geography := ST_GeogFromText(p_location_point);
        EXCEPTION WHEN OTHERS THEN
            location_geography := NULL;
        END;
    END IF;
    
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
