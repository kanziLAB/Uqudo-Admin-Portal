# Uqudo Admin Portal - Setup Guide

## Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] Supabase account created
- [ ] Supabase project created
- [ ] Database schema executed (supabase_schema.sql)

---

## Step 1: Get Supabase Credentials

### 1.1 Login to Supabase
Go to: https://supabase.com/dashboard

### 1.2 Select Your Project
Click on your Uqudo Admin Portal project

### 1.3 Get API Keys
Navigate to: **Settings** → **API**

You'll need:
1. **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
2. **anon/public key** (starts with `eyJhbGc...`)
3. **service_role key** (starts with `eyJhbGc...`) - Keep this SECRET!

---

## Step 2: Configure Backend

### 2.1 Create .env file

Run this command in your terminal:

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
cp .env.example .env
```

### 2.2 Edit .env file

Open the `.env` file and update these values:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-too-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:8080,http://localhost:3000
```

**Important:**
- Replace `YOUR_PROJECT_ID` with your actual Supabase project ID
- Replace `your-anon-key-here` with your Supabase anon key
- Replace `your-service-role-key-here` with your Supabase service role key
- Generate strong JWT secrets (use a password generator)

---

## Step 3: Install Dependencies

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
npm install
```

This will install:
- express
- @supabase/supabase-js
- jsonwebtoken
- bcryptjs
- cors
- helmet
- And other dependencies

---

## Step 4: Verify Database Schema

### 4.1 Check if schema is executed

Login to Supabase → **SQL Editor** → Run this query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'users', 'accounts', 'kyc_alerts', 'aml_cases');
```

You should see all 5 tables listed.

### 4.2 Check if demo user exists

```sql
SELECT email, role FROM users WHERE email = 'admin@demo.uqudo.com';
```

If no results, the demo user wasn't created. Let me know and I'll help create one.

---

## Step 5: Start Backend Server

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
npm run dev
```

You should see:
```
============================================================
🚀 Uqudo Admin Portal API Server Started
============================================================
Environment: development
Port: 3000
API Base URL: http://localhost:3000
Supabase URL: https://YOUR_PROJECT_ID.supabase.co
============================================================
```

### Test API Health Check

Open browser or use curl:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Uqudo Admin Portal API is running",
  "timestamp": "2024-01-15T...",
  "version": "1.0.0"
}
```

---

## Step 6: Create Demo User (If Needed)

If the demo user doesn't exist, create one:

### 6.1 Go to Supabase SQL Editor

Run this SQL:

```sql
-- Create demo tenant
INSERT INTO tenants (id, name, domain, status)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'Demo Tenant',
  'demo.uqudo.com',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Create demo admin user
-- Password: Admin@123 (hashed with bcrypt)
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
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'admin@demo.uqudo.com',
  '$2a$10$xQYZ1234567890abcdefghijklmnopqrstuvwxyz123456789', -- This is placeholder, needs real hash
  'Admin User',
  'mlro',
  'active',
  '["view_all", "edit_all", "delete_all", "manage_users", "manage_config"]'::jsonb
)
ON CONFLICT (email) DO NOTHING;
```

**Note:** The password hash above is a placeholder. I'll help you generate a real one.

---

## Step 7: Test Login API

### Using curl:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.uqudo.com",
    "password": "Admin@123"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@demo.uqudo.com",
      "fullName": "Admin User",
      "role": "mlro",
      "tenantId": "..."
    },
    "token": "eyJhbGc...",
    "refreshToken": "..."
  }
}
```

---

## Step 8: Setup Frontend

### 8.1 Update API Base URL

If your backend is not on `http://localhost:3000`, update this file:

**File:** `assets/js/api-client.js`

```javascript
// Line 8
constructor(baseURL = 'http://localhost:3000/api') {
  // Change to your backend URL if different
```

### 8.2 Start Frontend

You can either:

**Option A: Open directly in browser**
```bash
open "/Users/uqudo/Desktop/Admin Portal/ui-master/pages/sign-in.html"
```

**Option B: Use a local server (recommended)**
```bash
# Install http-server globally if you don't have it
npm install -g http-server

# Start server from project root
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
http-server -p 8080

# Open browser to:
# http://localhost:8080/pages/sign-in.html
```

---

## Troubleshooting

### Backend won't start

**Error:** `Cannot find module '@supabase/supabase-js'`
**Solution:** Run `npm install` in backend directory

**Error:** `JWT_SECRET is not defined`
**Solution:** Create .env file with proper configuration

**Error:** `EADDRINUSE: address already in use`
**Solution:** Port 3000 is busy. Change PORT in .env or kill the process:
```bash
lsof -ti:3000 | xargs kill -9
```

### Cannot connect to Supabase

**Error:** `Invalid Supabase URL`
**Solution:**
1. Check SUPABASE_URL in .env
2. Verify it starts with `https://`
3. Verify project exists in Supabase dashboard

**Error:** `Invalid API key`
**Solution:**
1. Verify SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env
2. Make sure you copied the full key (they're very long)
3. Check you didn't add extra spaces or line breaks

### Login fails

**Error:** `Invalid or expired token`
**Solution:** JWT_SECRET might be wrong, check .env

**Error:** `User not found`
**Solution:** Demo user wasn't created, run the SQL insert script

**Error:** `Incorrect password`
**Solution:** Password hash might be wrong, I'll help you create a proper one

### Frontend can't reach backend

**Error:** `Failed to fetch` or `Network error`
**Solution:**
1. Make sure backend is running (`npm run dev`)
2. Check backend is on port 3000
3. Verify CORS_ORIGIN in backend .env includes your frontend URL
4. Check browser console for CORS errors

---

## Quick Start Commands

```bash
# Terminal 1 - Start Backend
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
npm install
npm run dev

# Terminal 2 - Start Frontend
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
npx http-server -p 8080

# Then open browser:
# http://localhost:8080/pages/sign-in.html
```

---

## What Information Do I Need From You?

To complete the setup, please provide:

1. **Supabase Project URL** (from Settings → API)
2. **Supabase Anon Key** (from Settings → API)
3. **Supabase Service Role Key** (from Settings → API)
4. Confirm that the database schema was executed
5. Do you want me to create a demo user with a specific email/password?

Once you provide these, I'll:
1. Create the .env file with your credentials
2. Generate a proper password hash for the demo user
3. Create SQL to insert the demo user
4. Test the backend connection
5. Start building the frontend pages

---

## Security Notes

⚠️ **IMPORTANT:**
- NEVER commit .env file to git
- NEVER share your service_role key publicly
- Change JWT secrets before production
- Use strong passwords for user accounts
- Enable RLS policies in Supabase

---

## Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Verify all credentials in .env
3. Check backend logs in terminal
4. Check browser console for frontend errors
5. Let me know the specific error and I'll help debug

---

**Next Steps:**
Please provide your Supabase credentials so I can help you configure everything and get the backend running!
