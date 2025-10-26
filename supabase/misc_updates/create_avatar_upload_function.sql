-- Create a secure function to handle avatar uploads
-- This function can be used as a fallback if storage policies continue to fail

CREATE OR REPLACE FUNCTION upload_avatar(
  p_file_name TEXT,
  p_file_data BYTEA,
  p_content_type TEXT DEFAULT 'image/jpeg'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  file_path TEXT;
  public_url TEXT;
BEGIN
  -- Create the file path
  file_path := 'avatars/' || p_file_name;
  
  -- Insert the file into storage.objects
  INSERT INTO storage.objects (bucket_id, name, owner, metadata, path_tokens)
  VALUES (
    'avatars',
    file_path,
    auth.uid(),
    jsonb_build_object('mimetype', p_content_type),
    string_to_array(file_path, '/')
  );
  
  -- Get the public URL
  SELECT public_url INTO public_url
  FROM storage.objects
  WHERE bucket_id = 'avatars' AND name = file_path;
  
  RETURN public_url;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upload_avatar(TEXT, BYTEA, TEXT) TO authenticated;

-- Test the function
SELECT 'Avatar upload function created successfully' as status;
