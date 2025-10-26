-- Create storage bucket for bucket covers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bucket-covers',
  'bucket-covers',
  true,
  10485760, -- 10MB limit (larger than avatars since these are cover images)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Create storage policies for bucket-covers bucket
CREATE POLICY "bucket_covers_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'bucket-covers');

CREATE POLICY "bucket_covers_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'bucket-covers');

CREATE POLICY "bucket_covers_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'bucket-covers');

CREATE POLICY "bucket_covers_select" ON storage.objects
FOR SELECT USING (bucket_id = 'bucket-covers');

-- Create RPC function to update bucket data including cover_url
CREATE OR REPLACE FUNCTION update_bucket_secure(
    p_bucket_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_cover_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
    bucket_owner_id UUID;
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
    
    -- Verify user owns the bucket
    SELECT owner_id INTO bucket_owner_id FROM buckets WHERE id = p_bucket_id;
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != user_db_id THEN
        RAISE EXCEPTION 'Access denied: You do not own this bucket';
    END IF;
    
    -- Update the bucket with provided fields
    UPDATE buckets 
    SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        cover_url = COALESCE(p_cover_url, cover_url)
    WHERE id = p_bucket_id;
    
    RAISE NOTICE 'Updated bucket % with new data', p_bucket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
