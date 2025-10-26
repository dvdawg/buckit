ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN birthday DATE;


CREATE INDEX idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;
