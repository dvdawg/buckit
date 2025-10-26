-- Create a secure function to handle user profile creation
-- This function runs with SECURITY DEFINER to bypass RLS for the specific operation

CREATE OR REPLACE FUNCTION create_user_profile(
  p_auth_id UUID,
  p_full_name TEXT,
  p_handle TEXT,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Insert the user profile
  INSERT INTO users (auth_id, full_name, handle, avatar_url)
  VALUES (p_auth_id, p_full_name, p_handle, p_avatar_url)
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Test the function
SELECT 'User profile creation function created successfully' as status;
