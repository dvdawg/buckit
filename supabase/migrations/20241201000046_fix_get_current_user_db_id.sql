
CREATE OR REPLACE FUNCTION get_current_user_db_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
BEGIN
    auth_uid := auth.uid();
    
    RAISE NOTICE 'get_current_user_db_id: auth_uid = %', auth_uid;
    
    IF auth_uid IS NULL THEN
        RAISE NOTICE 'get_current_user_db_id: No auth.uid() found';
        RETURN NULL;
    END IF;
    
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    
    RAISE NOTICE 'get_current_user_db_id: user_db_id = %', user_db_id;
    
    RETURN user_db_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_current_user_db_id_simple()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION test_auth_context()
RETURNS TABLE (
    auth_uid UUID,
    user_count INTEGER,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_uid UUID;
    user_count INTEGER;
    user_id UUID;
BEGIN
    auth_uid := auth.uid();
    
    SELECT COUNT(*) INTO user_count FROM users WHERE auth_id = auth_uid;
    
    SELECT id INTO user_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    
    RETURN QUERY SELECT auth_uid, user_count, user_id;
END;
$$;
