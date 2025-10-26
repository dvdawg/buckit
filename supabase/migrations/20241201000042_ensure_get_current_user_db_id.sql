-- Ensure get_current_user_db_id function is properly defined
-- This function is critical for collaborator functionality

CREATE OR REPLACE FUNCTION get_current_user_db_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
END;
$$;
