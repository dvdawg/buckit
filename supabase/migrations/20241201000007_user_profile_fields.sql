-- Add phone number and birthday fields to users table
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN birthday DATE;

-- Add constraints for phone number format (optional validation)
-- Phone number should be in international format (e.g., +1234567890)
-- This is handled in the application layer for better UX

-- Add index for phone number lookups (if needed for future features)
CREATE INDEX idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;
