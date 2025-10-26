-- Disable email verification in Supabase
-- This script configures Supabase to not require email verification

-- 1. Update auth configuration to disable email confirmation
-- Note: This needs to be done in the Supabase Dashboard under Authentication > Settings
-- But we can also set it via SQL if the configuration table exists

-- Check if we can update auth settings via SQL
DO $$
BEGIN
    -- Try to update auth settings (this might not work depending on Supabase version)
    -- The main way to disable email verification is through the Supabase Dashboard
    
    RAISE NOTICE 'To disable email verification:';
    RAISE NOTICE '1. Go to your Supabase Dashboard';
    RAISE NOTICE '2. Navigate to Authentication > Settings';
    RAISE NOTICE '3. Under "User Signups", disable "Enable email confirmations"';
    RAISE NOTICE '4. Save the changes';
    
    -- Alternative: Update the auth.users table to mark existing users as confirmed
    -- This is useful if you have existing unconfirmed users
    UPDATE auth.users 
    SET email_confirmed_at = NOW() 
    WHERE email_confirmed_at IS NULL;
    
    RAISE NOTICE 'Updated existing unconfirmed users to be confirmed';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update auth settings via SQL. Please use the Supabase Dashboard.';
END $$;

-- 2. Verify the current auth configuration
SELECT 'Current auth configuration:' as info;
SELECT 
    key,
    value
FROM auth.config 
WHERE key IN ('SITE_URL', 'DISABLE_SIGNUP', 'ENABLE_EMAIL_CONFIRMATIONS')
ORDER BY key;

-- 3. Show unconfirmed users (if any)
SELECT 'Unconfirmed users:' as info;
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;
