
CREATE OR REPLACE FUNCTION create_item_secure(
    p_bucket_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT DEFAULT NULL,
    p_location_name TEXT DEFAULT NULL,
    p_location_point TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_user_id UUID;
    item_id UUID;
    location_geography GEOGRAPHY(POINT, 4326);
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
    
    INSERT INTO items (
        bucket_id, 
        owner_id, 
        title, 
        description, 
        location_name, 
        location_point,
        visibility, 
        urgency_level
    )
    VALUES (
        p_bucket_id, 
        p_user_id, 
        p_title, 
        p_description, 
        p_location_name, 
        location_geography,
        'private', 
        'no_rush'
    )
    RETURNING id INTO item_id;
    
    RETURN item_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION get_items_with_location_secure()
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    bucket_id UUID,
    title TEXT,
    description TEXT,
    location_name TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    deadline DATE,
    tags TEXT[],
    price_min INTEGER,
    price_max INTEGER,
    difficulty INTEGER,
    visibility TEXT,
    satisfaction_rating INTEGER,
    urgency_level TEXT,
    is_completed BOOLEAN,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    bucket_emoji TEXT,
    bucket_title TEXT,
    bucket_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_user_id UUID;
BEGIN
    p_user_id := get_current_user_db_id();
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        i.id,
        i.owner_id,
        i.bucket_id,
        i.title,
        i.description,
        i.location_name,
        CASE 
            WHEN i.location_point IS NOT NULL THEN ST_Y(i.location_point::geometry)
            ELSE NULL
        END as location_lat,
        CASE 
            WHEN i.location_point IS NOT NULL THEN ST_X(i.location_point::geometry)
            ELSE NULL
        END as location_lng,
        i.deadline,
        i.tags,
        i.price_min,
        i.price_max,
        i.difficulty,
        i.visibility,
        i.satisfaction_rating,
        i.urgency_level,
        i.is_completed,
        i.completed_at,
        i.created_at,
        b.emoji as bucket_emoji,
        b.title as bucket_title,
        b.color as bucket_color
    FROM items i
    LEFT JOIN buckets b ON i.bucket_id = b.id
    WHERE i.owner_id = p_user_id
    ORDER BY i.created_at DESC;
END;
$$;
