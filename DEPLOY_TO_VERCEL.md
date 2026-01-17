# Deploy to Vercel - Step by Step

## ✅ Ready to Deploy!

Your application is fully configured for Vercel deployment.

## Option 1: Deploy via GitHub Desktop (Recommended)

### Step 1: Commit Changes

In GitHub Desktop:

1. **Review changes** - You should see:
   - Modified: `.gitignore`, `assets/API_DOCUMENTATION.md`, `backend/server.js`
   - New files: SDK documentation, deployment guides

2. **Commit message:**
   ```
   Add SDK JWS endpoint and prepare for Vercel deployment

   - Add JWS token validation endpoint
   - Add comprehensive SDK documentation
   - Fix 405 error handling with debug logging
   - Update API documentation with SDK endpoints
   - Add deployment guides and troubleshooting
   ```

3. **Click "Commit to main"**

4. **Click "Push origin"** to push to GitHub

### Step 2: Connect to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`

### Step 3: Configure Environment Variables

In Vercel deployment settings, add these environment variables:

#### Required Variables:

```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key
CORS_ORIGIN=*
```

#### Optional Variables:

```
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important:**
- Add variables for **all three environments**: Production, Preview, Development
- Get Supabase keys from: Supabase Dashboard → Settings → API

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. Get your deployment URL (e.g., `https://uqudo-admin-portal.vercel.app`)

### Step 5: Update Mobile App

Replace the placeholder URL in your mobile app:

**Before:**
```
https://your-app.vercel.app/api/sdk-verification/enrollment-jws
```

**After (use your actual URL):**
```
https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws
```

### Step 6: Update CORS (if needed)

If you want to restrict CORS to your domain only:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Update `CORS_ORIGIN` from `*` to your domain:
   ```
   CORS_ORIGIN=https://uqudo-admin-portal.vercel.app
   ```
3. Redeploy

### Step 7: Verify Deployment

Test the endpoints:

```bash
# Health check
curl https://your-app.vercel.app/health

# API test (should return 400 - invalid token)
curl -X POST https://your-app.vercel.app/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}'
```

---

## Option 2: Deploy via Vercel CLI

If you prefer command line:

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
vercel
```

### Step 4: Deploy to Production

```bash
vercel --prod
```

---

## What Gets Deployed

### Backend API (Serverless Functions)
- `/api/*` → `backend/server.js`
- `/health` → `backend/server.js`

### Frontend (Static Site)
- `/pages/*` → Static HTML pages
- `/assets/*` → CSS, JS, images
- `/` → `server.js` (Express server for routing)

### Automatic Features
- ✅ HTTPS enabled
- ✅ CDN distribution
- ✅ Automatic scaling
- ✅ Zero-downtime deployments
- ✅ Environment variable management

---

## After Deployment

### 1. Get Your URLs

Vercel provides multiple URLs:
- **Production**: `https://your-project.vercel.app`
- **Preview**: `https://your-project-git-branch.vercel.app` (for PRs)
- **Custom Domain**: Configure in Vercel dashboard

### 2. Update Mobile App Configuration

Use your production URL in mobile app SDK configuration:

**Android:**
```kotlin
UqudoSDKConfig.Builder()
    .setWebhookUrl("https://your-actual-url.vercel.app/api/sdk-verification/enrollment-jws")
    .build()
```

**iOS:**
```swift
let config = UqudoSDKConfiguration()
config.webhookURL = "https://your-actual-url.vercel.app/api/sdk-verification/enrollment-jws"
```

### 3. Update Supabase CORS

1. Go to Supabase Dashboard → Settings → API
2. Add your Vercel URLs to allowed origins:
   ```
   https://your-project.vercel.app
   https://your-project-*.vercel.app
   ```

### 4. Test Complete Flow

1. ✅ Login to admin portal: `https://your-url.vercel.app/pages/uqudo-sign-in`
2. ✅ Submit SDK result from mobile
3. ✅ Check if account, alert, and case created automatically
4. ✅ View in admin portal

---

## Troubleshooting

### Build Failed

**Check:**
- All dependencies in `package.json`
- Node version compatibility
- Environment variables configured

**Fix:**
- Review build logs in Vercel dashboard
- Ensure `vercel.json` is committed

### 405 Error from Mobile

**Check:**
- Using correct URL (not placeholder)
- URL includes `/api` prefix
- Using POST method
- Content-Type header set

**Debug:**
- View function logs in Vercel dashboard
- Check "Functions" tab for errors

### Database Connection Failed

**Check:**
- `SUPABASE_URL` configured correctly
- `SUPABASE_SERVICE_ROLE_KEY` is service role key (not anon key)
- Supabase project is active

**Fix:**
- Verify environment variables in Vercel
- Test connection with Supabase dashboard

### CORS Errors

**Check:**
- `CORS_ORIGIN` is set to `*` or your domain
- Supabase CORS includes Vercel URLs

**Fix:**
- Update CORS_ORIGIN in Vercel
- Add Vercel URLs to Supabase allowed origins
- Redeploy

---

## Files Configuration

### ✅ vercel.json
- Routes API requests to backend
- Routes pages to frontend
- Already configured

### ✅ .vercelignore
- Excludes node_modules, logs, .env
- Already configured

### ✅ package.json
- Dependencies listed
- Start scripts configured

### ✅ Backend Configuration
- Express server with routes
- Supabase connection
- JWT authentication
- CORS enabled

---

## Monitoring

After deployment, monitor:

1. **Vercel Dashboard** → Your Project → Functions
   - View function logs
   - Check execution time
   - Monitor errors

2. **Vercel Dashboard** → Your Project → Analytics
   - Traffic stats
   - Performance metrics

3. **Supabase Dashboard** → Your Project → Logs
   - Database queries
   - API usage

---

## Custom Domain (Optional)

To use your own domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `admin.uqudo.com`)
3. Configure DNS records as instructed
4. Update `CORS_ORIGIN` with new domain
5. Update mobile app URL
6. Redeploy

---

## Continuous Deployment

Once connected to GitHub:

- ✅ Every push to `main` → Auto-deploy to production
- ✅ Every PR → Auto-deploy to preview URL
- ✅ Zero-downtime deployments
- ✅ Rollback available in Vercel dashboard

---

## Cost

**Vercel Free Tier:**
- 100 GB bandwidth/month
- 100 hours function execution/month
- Unlimited projects
- Automatic HTTPS
- Continuous deployment

**Upgrade needed if:**
- High traffic (>100 GB/month)
- Many API calls (>100 hrs/month)
- Need team collaboration

---

## Security Checklist

Before going live:

- [ ] All environment variables configured
- [ ] JWT secrets are strong (min 32 chars)
- [ ] Supabase RLS policies enabled
- [ ] CORS configured appropriately
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] .env files not committed
- [ ] Admin portal login tested

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Deployment Issues**: Check Vercel function logs
- **SDK Issues**: See `/SDK_MOBILE_405_FIX.md`
- **API Issues**: See `/assets/API_DOCUMENTATION.md`

---

## Quick Reference

**Production URL Format:**
```
https://your-project-name.vercel.app
```

**SDK Endpoints:**
```
POST /api/sdk-verification/enrollment-jws  (recommended)
POST /api/sdk-verification/jws             (shorter)
POST /api/sdk-verification/enrollment      (legacy)
```

**Admin Portal:**
```
https://your-url.vercel.app/pages/uqudo-sign-in
```

**Health Check:**
```
https://your-url.vercel.app/health
```

---

**Status**: ✅ Ready to deploy
**Estimated Time**: 5-10 minutes
**Next Step**: Push to GitHub using GitHub Desktop, then connect to Vercel
