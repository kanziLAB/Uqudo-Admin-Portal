# ⚡ NEXT STEP - Run SQL in Supabase (2 minutes)

## 🎯 What You Need to Do

Your Supabase connection is working, but we need to add a `password_hash` column to the `users` table to enable authentication.

### Step 1: Open Supabase SQL Editor

Click this link:
```
https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/sql/new
```

### Step 2: Copy the SQL

Open the file: `RUN_THIS_SQL_IN_SUPABASE.sql` in this directory

Or copy this SQL:

```sql
-- Add password_hash column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update existing admin@uqudo.com user with password
UPDATE users
SET password_hash = '$2a$10$wzyWloUFSqt8dPR/MoUG7.2GXizqeXod8p4HHJ94YuOFp2lVItkXS'
WHERE email = 'admin@uqudo.com';

-- Create demo user admin@demo.uqudo.com
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

-- Verify users
SELECT email, full_name, role, status,
    CASE WHEN password_hash IS NOT NULL THEN '✓ Password set' ELSE '✗ No password' END as password_status
FROM users
ORDER BY created_at;
```

### Step 3: Run the SQL

1. Paste the SQL into the Supabase SQL Editor
2. Click the **"Run"** button (or press Cmd/Ctrl + Enter)
3. You should see a result showing 2 users with "✓ Password set"

### Step 4: Done!

After running the SQL, you'll have two users:

| Email | Password | Role |
|-------|----------|------|
| admin@uqudo.com | Admin@123 | MLRO |
| admin@demo.uqudo.com | Admin@123 | MLRO |

---

## 🚀 What Happens Next (Automatic)

Once you confirm the SQL ran successfully, I'll:

1. ✅ Start the backend server
2. ✅ Start the frontend server
3. ✅ Test the login
4. ✅ Build the Dashboard page
5. ✅ Build the other frontend pages

---

## ⏱️ Estimated Time

- Running SQL: **1 minute**
- Starting servers: **30 seconds**
- Testing login: **30 seconds**

**Total: ~2 minutes to have a working login!**

---

## ❓ If You Get An Error

**Error:** `column "password_hash" already exists`
- This is OK! It means the column was already added
- The SQL will skip this step and continue

**Error:** `relation "users" does not exist`
- The users table doesn't exist
- You need to run the full schema: `database/supabase_schema.sql`

**Error:** `duplicate key value violates unique constraint`
- A user with that email already exists
- This is OK! The SQL will update the existing user instead

---

## ✅ Once SQL is Run

Come back here and type:
```
SQL executed successfully
```

And I'll continue with starting the servers and building the frontend!

---

**Need help?** Just let me know what error you see!
