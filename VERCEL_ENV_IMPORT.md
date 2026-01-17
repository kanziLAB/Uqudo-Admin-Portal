# How to Import Environment Variables to Vercel

## ✅ Quick Answer: Yes!

I've created **`.env.vercel`** file specifically for Vercel import. You can import all environment variables at once instead of entering them manually.

## 📋 Step-by-Step Guide

### Step 1: Fill in Your Values

Open **`.env.vercel`** and replace the placeholder values with your actual credentials:

```bash
# Open the file
open /Users/uqudo/Desktop/Admin\ Portal/ui-master/.env.vercel

# Or edit with any text editor
nano /Users/uqudo/Desktop/Admin\ Portal/ui-master/.env.vercel
```

**Required Values to Fill**:

1. **`SUPABASE_URL`** - Your Supabase project URL
   - Find it at: Supabase Dashboard → Settings → API → Project URL
   - Example: `https://abcdefghijklmnop.supabase.co`

2. **`SUPABASE_SERVICE_ROLE_KEY`** - Your service role key (secret!)
   - Find it at: Supabase Dashboard → Settings → API → service_role key
   - Click "Reveal" and copy the key
   - ⚠️ Keep this secret! Don't share it publicly

3. **`JWT_SECRET`** - A random secret string (minimum 32 characters)
   - Generate one: `openssl rand -base64 32`
   - Or use: https://www.uuidgenerator.net/

4. **`JWT_REFRESH_SECRET`** - Another random secret string
   - Generate one: `openssl rand -base64 32`
   - Must be different from JWT_SECRET

5. **`CORS_ORIGIN`** - Your Vercel deployment URL
   - First deployment: use `https://uqudo-admin-portal.vercel.app`
   - After deployment: update with your actual URL

### Step 2: Import to Vercel

#### Option A: Import via Vercel Dashboard (Easiest)

1. **Go to your project in Vercel**:
   - After connecting your GitHub repo
   - Before clicking "Deploy"
   - Or go to: Settings → Environment Variables

2. **Click "Import .env File"**:
   - Look for the button/link at the top right
   - Or click "Add Environment Variable" → "Import .env"

3. **Upload the file**:
   - Select `.env.vercel` from your project folder
   - Or copy-paste the contents

4. **Select environments**:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Click "Import"**

6. **Verify**:
   - Check that all variables are imported
   - Sensitive values should show as "•••••••"

#### Option B: Import via Vercel CLI

```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master

# Login to Vercel
npx vercel login

# Link your project (if not already linked)
npx vercel link

# Pull current env vars (optional - to see what's there)
npx vercel env pull

# Add environment variables from file
npx vercel env add SUPABASE_URL production < .env.vercel
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production < .env.vercel
# ... (repeat for each variable)

# Or import all at once (if supported)
npx vercel env pull .env.vercel
```

#### Option C: Copy-Paste Method

If import button is not available:

1. Open `.env.vercel` in a text editor
2. In Vercel dashboard, click "Add Environment Variable"
3. Copy variable name (e.g., `SUPABASE_URL`)
4. Copy the value
5. Select environments: Production, Preview, Development
6. Click "Save"
7. Repeat for each variable

---

## 🔒 Security Tips

1. **Never commit `.env.vercel` with real values to Git**
   - The file is already in `.gitignore`
   - Only use it locally to prepare for import

2. **Generate Strong Secrets**:
   ```bash
   # Generate JWT_SECRET
   openssl rand -base64 32

   # Generate JWT_REFRESH_SECRET
   openssl rand -base64 32
   ```

3. **Use Different Secrets for Production and Development**:
   - You can add different values for each environment in Vercel

4. **Keep Service Role Key Private**:
   - Never expose this in client-side code
   - Never commit it to public repositories

---

## 📝 Environment Variables Explained

### Required Variables

| Variable | Purpose | Where to Get It |
|----------|---------|-----------------|
| `SUPABASE_URL` | Supabase project endpoint | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend database access | Supabase Dashboard → Settings → API (Reveal) |
| `JWT_SECRET` | Sign authentication tokens | Generate with `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Sign refresh tokens | Generate with `openssl rand -base64 32` |
| `CORS_ORIGIN` | Allowed frontend origin | Your Vercel URL (after deployment) |

### Optional Variables (With Defaults)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Environment mode |
| `JWT_EXPIRES_IN` | `24h` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

---

## 🔄 Update CORS After First Deployment

After your first deployment:

1. **Copy your Vercel URL** (e.g., `https://uqudo-admin-portal-abc123.vercel.app`)

2. **Update CORS_ORIGIN**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Find `CORS_ORIGIN`
   - Click "Edit"
   - Replace with your actual URL
   - Save

3. **Redeploy**:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

4. **Update Supabase CORS**:
   - Go to Supabase Dashboard → Settings → API
   - Scroll to "CORS"
   - Add your Vercel URL:
     ```
     https://uqudo-admin-portal-abc123.vercel.app
     https://uqudo-admin-portal-*.vercel.app
     ```

---

## ✅ Verification Checklist

After importing environment variables:

- [ ] All required variables are present
- [ ] Sensitive values show as "•••••••"
- [ ] Variables are added to all three environments
- [ ] SUPABASE_URL format: `https://[project].supabase.co`
- [ ] JWT secrets are at least 32 characters
- [ ] CORS_ORIGIN matches your Vercel URL

---

## 🚨 Troubleshooting

### Issue: Can't find "Import .env" button

**Solution**:
- The feature might be in a different location depending on Vercel UI version
- Use copy-paste method (Option C above)
- Or use Vercel CLI (Option B above)

### Issue: Import fails with "Invalid format"

**Solution**:
- Ensure no comments on the same line as values
- Format should be: `KEY=value` (no spaces around `=`)
- No quotes needed around values

### Issue: Variables not working after import

**Solution**:
1. Check variables are saved (go to Settings → Environment Variables)
2. Verify correct environments are selected
3. Redeploy after adding variables
4. Check function logs for errors

### Issue: CORS errors after deployment

**Solution**:
1. Update `CORS_ORIGIN` with actual Vercel URL
2. Redeploy
3. Update Supabase CORS settings
4. Clear browser cache

---

## 🎯 Quick Commands

```bash
# Generate JWT secrets
openssl rand -base64 32

# Open env file for editing
open /Users/uqudo/Desktop/Admin\ Portal/ui-master/.env.vercel

# Check what's in the file
cat /Users/uqudo/Desktop/Admin\ Portal/ui-master/.env.vercel

# Copy file contents to clipboard (macOS)
cat /Users/uqudo/Desktop/Admin\ Portal/ui-master/.env.vercel | pbcopy
```

---

## 📚 Related Documentation

- **Main Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
- **Quick Start**: See `DEPLOY_NOW.md`
- **Vercel Docs**: https://vercel.com/docs/concepts/projects/environment-variables

---

**Status**: Ready to import! ✅

**Next Step**:
1. Fill in your values in `.env.vercel`
2. Import to Vercel dashboard
3. Deploy your application

**File Location**: `/Users/uqudo/Desktop/Admin Portal/ui-master/.env.vercel`
