# Vercel Environment Variables

## Required Variables for Face Images Integration

Add these environment variables in Vercel Dashboard:

**Path**: Vercel Dashboard → Your Project → Settings → Environment Variables

### Uqudo API Configuration

```env
# Uqudo Client Credentials
UQUDO_CLIENT_ID=456edf22-e887-4a32-b2e5-334bf902831f
UQUDO_CLIENT_SECRET=9OPYykfpSPWVr0uCTgeaER9hTLsStlhWd2SI3JA7ycWAcOvUawUtKZJW7fGE9dbx

# Uqudo API Endpoints
UQUDO_AUTH_URL=https://id.uqudo.io/api/oauth2/token
UQUDO_INFO_API_URL=https://id.uqudo.io/api/v2/info
```

### How to Add

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **Settings** in the top menu
4. Click **Environment Variables** in the left sidebar
5. For each variable:
   - Click **Add New**
   - Enter **Name** (e.g., `UQUDO_CLIENT_ID`)
   - Enter **Value** (e.g., `456edf22-e887-4a32-b2e5-334bf902831f`)
   - Select environment: **Production**, **Preview**, **Development** (check all)
   - Click **Save**

### Verification

After adding, redeploy your application:
1. Go to **Deployments**
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**

Or trigger a new deployment by pushing to GitHub.

---

## Complete Environment Variables List

For reference, here's the complete list of environment variables needed:

```env
# Supabase Configuration (should already be set)
SUPABASE_URL=https://kpmcigujptbolpdlfojo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Uqudo API Configuration (NEW - add these)
UQUDO_CLIENT_ID=456edf22-e887-4a32-b2e5-334bf902831f
UQUDO_CLIENT_SECRET=9OPYykfpSPWVr0uCTgeaER9hTLsStlhWd2SI3JA7ycWAcOvUawUtKZJW7fGE9dbx
UQUDO_AUTH_URL=https://id.uqudo.io/api/oauth2/token
UQUDO_INFO_API_URL=https://id.uqudo.io/api/v2/info

# JWT Configuration (should already be set)
JWT_SECRET=your-secret-key-here
```

---

## Security Notes

- ✅ Environment variables are encrypted in Vercel
- ✅ Never commit these to git
- ✅ Each deployment environment can have different values
- ⚠️ Client credentials have read-only scope
- ⚠️ Rotate credentials periodically for security

---

## Testing

After adding environment variables, check Vercel function logs:

1. Complete a new SDK verification from mobile
2. Go to Vercel Dashboard → Deployments → Latest → Functions
3. Look for logs showing:
   ```
   🔐 Requesting Uqudo API access token...
   ✅ Access token obtained successfully
   📸 Fetching images for session: abc123
   ✅ Info API response received for session: abc123
   ✅ Images fetched and stored for account: uuid
   ```

If you see errors, verify the environment variables are set correctly.
