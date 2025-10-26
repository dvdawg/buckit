-- Fix get_current_user_db_id function to work properly
-- The issue is that it's returning null, which breaks all collaborator functionality

CREATE OR REPLACE FUNCTION get_current_user_db_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
BEGIN
    -- Get the current auth user ID
    auth_uid := auth.uid();
    
    -- Debug: Log the auth UID
    RAISE NOTICE 'get_current_user_db_id: auth_uid = %', auth_uid;
    
    IF auth_uid IS NULL THEN
        RAISE NOTICE 'get_current_user_db_id: No auth.uid() found';
        RETURN NULL;
    END IF;
    
    -- Get the corresponding user ID from the users table
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    
    -- Debug: Log the result
    RAISE NOTICE 'get_current_user_db_id: user_db_id = %', user_db_id;
    
    RETURN user_db_id;
END;
$$;

-- Also create a simpler version that might work better
CREATE OR REPLACE FUNCTION get_current_user_db_id_simple()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Test function to check auth context
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
    -- Get auth.uid()
    auth_uid := auth.uid();
    
    -- Count users with this auth_id
    SELECT COUNT(*) INTO user_count FROM users WHERE auth_id = auth_uid;
    
    -- Get the user ID
    SELECT id INTO user_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    
    RETURN QUERY SELECT auth_uid, user_count, user_id;
END;
$$;
