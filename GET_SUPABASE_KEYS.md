# How to Get Your Supabase API Keys

I need two keys from your Supabase project to complete the setup:

## Step 1: Go to Supabase Dashboard

Open this URL in your browser:
```
https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo
```

## Step 2: Navigate to API Settings

Click on: **Settings** (in left sidebar) → **API**

Or go directly to:
```
https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/settings/api
```

## Step 3: Copy These Two Keys

You'll see a page with several keys. I need these two:

### 1. Project API keys → anon / public
**Label:** `anon` or `public`
**Looks like:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtw...` (very long)

Click the **Copy** button next to it.

### 2. Project API keys → service_role
**Label:** `service_role`
**Looks like:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtw...` (very long)
**⚠️ This is SECRET - don't share publicly**

Click the **Copy** button next to it.

## Step 4: Provide Them to Me

Once you have both keys, paste them here in this format:

```
ANON_KEY=eyJhbGc... (paste the full anon key)
SERVICE_ROLE_KEY=eyJhbGc... (paste the full service_role key)
```

---

## Alternative: Screenshot

If you prefer, you can take a screenshot of the API settings page (make sure the service_role key is visible) and I can extract the keys from there.

---

## Why We Need These Keys

- **anon key**: Used for public/client-side operations (safe to expose)
- **service_role key**: Used for admin operations, bypasses Row Level Security (must be kept secret)

The publishable key you provided earlier (`sb_publishable_uC5ccceMohILx-eExeWdjw_17nIgk4a`) is different from the standard Supabase keys and may not work with the Supabase JS client.

---

## Once I Have the Keys

I'll:
1. ✅ Update the `.env` file
2. ✅ Test the connection to your database
3. ✅ Verify the schema is loaded
4. ✅ Create a demo user for you to login
5. ✅ Start the backend server
6. ✅ Test the login functionality
7. ✅ Continue building the frontend pages
