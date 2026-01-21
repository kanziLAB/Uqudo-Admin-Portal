-- Migration: Add user preferences column for theme and other settings
-- Run this migration to add support for user preferences including dark mode

-- Add preferences column to users table (JSONB for flexible storage)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"theme_preference": "system", "notifications_enabled": true, "language": "en"}'::jsonb;

-- Create index for faster JSON queries on preferences
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin (preferences);

-- Add comment for documentation
COMMENT ON COLUMN users.preferences IS 'User preferences including theme_preference (light/dark/system), notifications_enabled, language';

-- Backfill existing users with default preferences (only if preferences is null)
UPDATE users
SET preferences = '{"theme_preference": "system", "notifications_enabled": true, "language": "en"}'::jsonb
WHERE preferences IS NULL;
