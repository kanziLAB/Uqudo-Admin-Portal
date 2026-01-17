# Vercel + Supabase Integration - Environment Variables

## ✅ What Vercel Auto-Imported

When you connected Supabase to Vercel, it automatically added these variables:

- ✅ `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ⚠️ **Maybe** `SUPABASE_SERVICE_ROLE_KEY` (depends on integration settings)

## ❌ What You STILL Need to Add Manually

Your Uqudo Admin Portal requires additional variables that Vercel did NOT import:

### Critical - Must Add:

1. **`JWT_SECRET`** - Used by your backend to sign authentication tokens
   ```
   JWT_SECRET=shiV9eFZ23W30UtQNGaGAuv08WF9BQ848Px+jjwZ6Q0=
   ```

2. **`JWT_REFRESH_SECRET`** - Used for refresh token signing
   ```
   JWT_REFRESH_SECRET=uB/AxiG/EnWRvHAdnU/HkQBQQyA854GFprzYuTNUJA4=
   ```

3. **`CORS_ORIGIN`** - Allows frontend to communicate with backend
   ```
   CORS_ORIGIN=https://your-actual-vercel-url.vercel.app
   ```

### Important - Check if Imported:

4. **`SUPABASE_SERVICE_ROLE_KEY`** - Backend database access (might not be auto-imported)
   - If missing, get it from: Supabase Dashboard → Settings → API → service_role key

### Optional - With Defaults:

5. **`NODE_ENV`** - Environment mode
   ```
   NODE_ENV=production
   ```

6. **Token Lifetimes** (optional, has defaults):
   ```
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d
   ```

7. **Rate Limiting** (optional, has defaults):
   ```
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

---

## 🔍 Step 1: Check What You Have

### Go to Vercel Dashboard:

1. Open your project in Vercel
2. Go to: **Settings → Environment Variables**
3. Check if you have these variables:

| Variable | Auto-Imported? | Still Need? |
|----------|----------------|-------------|
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | No |
| `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | No |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Maybe | Check! |
| `JWT_SECRET` | ❌ No | **YES** |
| `JWT_REFRESH_SECRET` | ❌ No | **YES** |
| `CORS_ORIGIN` | ❌ No | **YES** |
| `NODE_ENV` | ⚠️ Maybe | Good to add |

---

## ⚡ Step 2: Add Missing Variables

### Quick Add Method (Recommended):

1. **In Vercel Dashboard**: Settings → Environment Variables
2. **Click**: "Add Environment Variable"
3. **Add these one by one**:

```bash
# Name: JWT_SECRET
# Value: shiV9eFZ23W30UtQNGaGAuv08WF9BQ848Px+jjwZ6Q0=
# Environments: ✅ Production ✅ Preview ✅ Development

# Name: JWT_REFRESH_SECRET
# Value: uB/AxiG/EnWRvHAdnU/HkQBQQyA854GFprzYuTNUJA4=
# Environments: ✅ Production ✅ Preview ✅ Development

# Name: CORS_ORIGIN
# Value: https://your-deployment-url.vercel.app
# Environments: ✅ Production ✅ Preview ✅ Development

# Name: NODE_ENV
# Value: production
# Environments: ✅ Production ✅ Preview ✅ Development
```

4. **Save each variable**

---

## 🔧 Step 3: Fix Variable Names (If Needed)

Vercel's Supabase integration might have added variables with `NEXT_PUBLIC_` prefix. Your backend needs them **without** the prefix.

### Check and Add if Missing:

**If you have**: `NEXT_PUBLIC_SUPABASE_URL`
**You need to add**: `SUPABASE_URL` (same value, no prefix)

**If you have**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**You might skip**: Your backend uses service role key, not anon key

**Must have**: `SUPABASE_SERVICE_ROLE_KEY` (no prefix!)

### How to Add:

1. In Environment Variables section
2. Add new variable: `SUPABASE_URL`
3. Copy value from `NEXT_PUBLIC_SUPABASE_URL`
4. Select all three environments
5. Save

Repeat for `SUPABASE_SERVICE_ROLE_KEY` if missing.

---

## 📋 Complete Checklist

Before deploying, verify you have:

### Backend API Variables (no NEXT_PUBLIC_ prefix):

- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret!)
- [ ] `JWT_SECRET` - Generated secret for JWT tokens
- [ ] `JWT_REFRESH_SECRET` - Generated secret for refresh tokens
- [ ] `CORS_ORIGIN` - Your Vercel deployment URL
- [ ] `NODE_ENV` - Set to "production"

### Optional But Recommended:

- [ ] `JWT_EXPIRES_IN` - Default: 24h
- [ ] `JWT_REFRESH_EXPIRES_IN` - Default: 7d
- [ ] `RATE_LIMIT_WINDOW_MS` - Default: 900000
- [ ] `RATE_LIMIT_MAX_REQUESTS` - Default: 100

---

## 🚀 Step 4: Redeploy

After adding all variables:

1. **Go to**: Deployments tab
2. **Click**: "..." menu on latest deployment
3. **Select**: "Redeploy"
4. **Wait**: 2-5 minutes

Or trigger a new deployment by pushing to GitHub.

---

## 🎯 Quick Copy-Paste Values

Add these in Vercel Environment Variables section:

```bash
# 1. JWT_SECRET
JWT_SECRET=shiV9eFZ23W30UtQNGaGAuv08WF9BQ848Px+jjwZ6Q0=

# 2. JWT_REFRESH_SECRET
JWT_REFRESH_SECRET=uB/AxiG/EnWRvHAdnU/HkQBQQyA854GFprzYuTNUJA4=

# 3. NODE_ENV
NODE_ENV=production

# 4. CORS_ORIGIN (replace with your actual Vercel URL)
CORS_ORIGIN=https://uqudo-admin-portal.vercel.app

# 5. JWT_EXPIRES_IN (optional)
JWT_EXPIRES_IN=24h

# 6. JWT_REFRESH_EXPIRES_IN (optional)
JWT_REFRESH_EXPIRES_IN=7d

# 7. RATE_LIMIT_WINDOW_MS (optional)
RATE_LIMIT_WINDOW_MS=900000

# 8. RATE_LIMIT_MAX_REQUESTS (optional)
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🔍 How to Get Missing Supabase Values

If `SUPABASE_SERVICE_ROLE_KEY` wasn't auto-imported:

1. **Go to**: https://supabase.com/dashboard
2. **Select**: Your project
3. **Go to**: Settings → API
4. **Find**: "service_role key" section
5. **Click**: "Reveal" (⚠️ This is secret!)
6. **Copy**: The key
7. **Add to Vercel**: As `SUPABASE_SERVICE_ROLE_KEY`

---

## ❗ Common Issues

### Issue 1: "JWT_SECRET is not defined"

**Cause**: JWT secrets weren't added
**Solution**: Add `JWT_SECRET` and `JWT_REFRESH_SECRET` manually (see above)

### Issue 2: "CORS error" in browser console

**Cause**: `CORS_ORIGIN` not set or incorrect
**Solution**:
1. Add/update `CORS_ORIGIN` with your actual Vercel URL
2. Redeploy
3. Update Supabase CORS settings

### Issue 3: "Invalid or expired token"

**Cause**: `JWT_SECRET` doesn't match between deployments
**Solution**: Ensure `JWT_SECRET` is the same across all environments

### Issue 4: Database connection fails

**Cause**: Missing `SUPABASE_SERVICE_ROLE_KEY` or using anon key
**Solution**: Add service role key (not anon key) for backend

---

## 📊 Environment Variables Summary

| Variable | Source | Required? | Notes |
|----------|--------|-----------|-------|
| `SUPABASE_URL` | Vercel auto-import | ✅ Yes | Check if has `NEXT_PUBLIC_` prefix |
| `SUPABASE_SERVICE_ROLE_KEY` | Maybe auto-import | ✅ Yes | Backend needs this, not anon key |
| `JWT_SECRET` | **You must add** | ✅ Yes | Use generated value above |
| `JWT_REFRESH_SECRET` | **You must add** | ✅ Yes | Use generated value above |
| `CORS_ORIGIN` | **You must add** | ✅ Yes | Your Vercel URL |
| `NODE_ENV` | **You must add** | ⚠️ Recommended | Set to "production" |
| Others | **You can add** | ❌ Optional | Have defaults |

---

## ✅ Answer to Your Question

**Do you still need to import environment variables?**

**YES** - You need to manually add:
1. ✅ `JWT_SECRET` (critical!)
2. ✅ `JWT_REFRESH_SECRET` (critical!)
3. ✅ `CORS_ORIGIN` (critical!)
4. ⚠️ `SUPABASE_SERVICE_ROLE_KEY` (check if imported)
5. ⚠️ `NODE_ENV` (recommended)

**NO** - These were auto-imported:
- ✅ `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- ✅ `SUPABASE_ANON_KEY` (not used by backend)

---

## 🎬 Next Steps

1. **Go to Vercel**: https://vercel.com/dashboard
2. **Open your project**: Uqudo-Admin-Portal
3. **Go to**: Settings → Environment Variables
4. **Add missing variables** (see list above)
5. **Redeploy** your application
6. **Test** the deployment

---

**Quick Access**:
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard

**Generated Secrets** (save these!):
```
JWT_SECRET=shiV9eFZ23W30UtQNGaGAuv08WF9BQ848Px+jjwZ6Q0=
JWT_REFRESH_SECRET=uB/AxiG/EnWRvHAdnU/HkQBQQyA854GFprzYuTNUJA4=
```
