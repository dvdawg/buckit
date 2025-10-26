
ALTER TABLE users ADD COLUMN preferences_completed BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_preferences_completed ON users(preferences_completed) WHERE preferences_completed = TRUE;

COMMENT ON COLUMN users.preferences_completed IS 'Tracks whether user has completed initial preferences setup during registration';
