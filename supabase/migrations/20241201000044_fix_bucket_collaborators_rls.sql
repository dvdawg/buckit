
DROP POLICY IF EXISTS "Users can view bucket collaborators" ON bucket_collaborators;
DROP POLICY IF EXISTS "Bucket owners can manage collaborators" ON bucket_collaborators;


CREATE POLICY "bucket_collaborators_select" ON bucket_collaborators
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "bucket_collaborators_insert" ON bucket_collaborators
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bucket_collaborators_update" ON bucket_collaborators
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "bucket_collaborators_delete" ON bucket_collaborators
    FOR DELETE USING (auth.uid() IS NOT NULL);
