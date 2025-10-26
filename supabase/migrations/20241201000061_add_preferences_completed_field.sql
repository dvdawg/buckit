-- Add preferences_completed field to users table
-- This field tracks whether the user has completed the initial preferences setup

ALTER TABLE users ADD COLUMN preferences_completed BOOLEAN DEFAULT FALSE;

-- Add index for performance when checking preferences completion
CREATE INDEX idx_users_preferences_completed ON users(preferences_completed) WHERE preferences_completed = TRUE;

-- Update the type definitions comment
COMMENT ON COLUMN users.preferences_completed IS 'Tracks whether user has completed initial preferences setup during registration';
