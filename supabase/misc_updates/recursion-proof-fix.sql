-- RECURSION-PROOF FIX: Use PostgreSQL's built-in mechanisms to avoid recursion
-- This uses a completely different approach that PostgreSQL handles natively

-- Step 1: Completely reset all policies
DROP POLICY IF EXISTS "buckets_authenticated_only" ON buckets;
DROP POLICY IF EXISTS "items_authenticated_only" ON items;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Step 2: Create a view-based approach to avoid direct table access
-- This uses PostgreSQL's view mechanism to break the recursion

-- Create a view that safely gets user data without recursion
CREATE OR REPLACE VIEW current_user_view AS
SELECT id, auth_id FROM users WHERE auth_id = auth.uid();

-- Step 3: Create policies that use the view instead of direct table access
-- This breaks the recursion because views are handled differently by PostgreSQL

CREATE POLICY "buckets_owner_access" ON buckets
    FOR ALL USING (
        owner_id IN (SELECT id FROM current_user_view)
    );

CREATE POLICY "items_owner_access" ON items
    FOR ALL USING (
        owner_id IN (SELECT id FROM current_user_view)
    );

CREATE POLICY "items_bucket_access" ON items
    FOR SELECT USING (
        bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id IN (SELECT id FROM current_user_view)
        )
    );

-- Step 4: Create user policies using the view
CREATE POLICY "users_own_data" ON users
    FOR ALL USING (
        auth_id = auth.uid()
    );
