-- Add password_hash column to users table for authentication
-- Run this in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update the existing admin user with a password hash
-- Password: Admin@123
-- Hash generated with bcrypt
UPDATE users
SET password_hash = '$2a$10$wzyWloUFSqt8dPR/MoUG7.2GXizqeXod8p4HHJ94YuOFp2lVItkXS'
WHERE email = 'admin@uqudo.com'
AND password_hash IS NULL;

-- Verify the update
SELECT
    id,
    email,
    full_name,
    role,
    status,
    CASE
        WHEN password_hash IS NOT NULL THEN '✓ Password set'
        ELSE '✗ No password'
    END as password_status
FROM users;
