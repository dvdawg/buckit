-- Create storage bucket for challenge photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'challenge-photos',
  'challenge-photos',
  true,
  10485760, -- 10MB limit (same as bucket covers)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Create storage policies for challenge-photos bucket
CREATE POLICY "challenge_photos_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'challenge-photos');

CREATE POLICY "challenge_photos_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'challenge-photos');

CREATE POLICY "challenge_photos_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'challenge-photos');

CREATE POLICY "challenge_photos_select" ON storage.objects
FOR SELECT USING (bucket_id = 'challenge-photos');
