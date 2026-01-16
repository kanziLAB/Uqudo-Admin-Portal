-- ============================================================================
-- IMPORTANT: Run this SQL in Supabase SQL Editor
-- ============================================================================
-- Go to: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/sql/new
-- Paste this entire file and click "Run"
-- ============================================================================

-- Step 1: Add password_hash column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Step 2: Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Step 3: Update existing admin@uqudo.com user with password
-- Password: Admin@123
UPDATE users
SET password_hash = '$2a$10$wzyWloUFSqt8dPR/MoUG7.2GXizqeXod8p4HHJ94YuOFp2lVItkXS'
WHERE email = 'admin@uqudo.com';

-- Step 4: Create demo user admin@demo.uqudo.com if it doesn't exist
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    full_name,
    role,
    status,
    permissions
)
VALUES (
    'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj',
    '00000000-0000-0000-0000-000000000001',
    'admin@demo.uqudo.com',
    '$2a$10$wzyWloUFSqt8dPR/MoUG7.2GXizqeXod8p4HHJ94YuOFp2lVItkXS',
    'Demo Admin User',
    'mlro',
    'active',
    '["view_all", "edit_all", "delete_all", "manage_users", "manage_config"]'::jsonb
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Step 5: Verify users
SELECT
    email,
    full_name,
    role,
    status,
    CASE
        WHEN password_hash IS NOT NULL THEN '✓ Password set'
        ELSE '✗ No password'
    END as password_status,
    created_at
FROM users
ORDER BY created_at;

-- ============================================================================
-- EXPECTED RESULT:
-- You should see 2 users:
-- 1. admin@uqudo.com with password set
-- 2. admin@demo.uqudo.com with password set
--
-- Both passwords are: Admin@123
-- ============================================================================
