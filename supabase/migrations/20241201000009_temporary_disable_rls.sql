-- Temporarily disable RLS for buckets and items to fix the infinite recursion issue
-- This is a temporary fix until the proper RLS policies can be implemented

-- Disable RLS temporarily
ALTER TABLE buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;

-- Re-enable with simple policies
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create very simple policies that don't cause recursion
CREATE POLICY "Allow all operations for authenticated users" ON buckets
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all operations for authenticated users" ON items
    FOR ALL USING (auth.uid() IS NOT NULL);
