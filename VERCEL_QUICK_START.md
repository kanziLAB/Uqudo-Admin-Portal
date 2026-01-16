# Vercel Quick Start Guide

## Files Created for Deployment

✅ `/vercel.json` - Vercel configuration
✅ `/.vercelignore` - Files to exclude from deployment
✅ `/.env.example` - Environment variables template
✅ `/DEPLOYMENT_GUIDE.md` - Complete deployment guide
✅ `/assets/js/api-client.js` - Updated to auto-detect environment

## Deployment Steps

### Option 1: Quick Deploy (CLI)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to project
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master

# 3. Login to Vercel
vercel login

# 4. Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? [Your account]
# - Link to existing project? No
# - Project name? uqudo-admin-portal
# - Directory? ./
# - Override settings? No

# 5. Deploy to production
vercel --prod
```

### Option 2: Deploy via Git (Recommended)

1. **Push to GitHub**:
```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
git init
git add .
git commit -m "Initial commit - Uqudo Admin Portal"
git remote add origin https://github.com/your-username/uqudo-admin-portal.git
git push -u origin main
```

2. **Connect to Vercel**:
   - Go to https://vercel.com/new
   - Import your Git repository
   - Vercel auto-detects configuration from `vercel.json`
   - Click "Deploy"

## Environment Variables

Configure these in Vercel Dashboard → Settings → Environment Variables:

### Required:
```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=https://your-app.vercel.app
```

### Optional:
```
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important**: Add variables for all three environments:
- ✅ Production
- ✅ Preview
- ✅ Development

## Post-Deployment

### 1. Update CORS

After getting your Vercel URL (e.g., `https://uqudo-admin-portal.vercel.app`):

1. Update `CORS_ORIGIN` in Vercel environment variables:
   ```
   CORS_ORIGIN=https://uqudo-admin-portal.vercel.app
   ```

2. Update Supabase CORS settings:
   - Go to Supabase Dashboard → Settings → API
   - Add to allowed origins:
     ```
     https://uqudo-admin-portal.vercel.app
     https://uqudo-admin-portal-*.vercel.app
     ```

3. Redeploy:
   ```bash
   vercel --prod
   ```

### 2. Verify Deployment

Test these URLs:

✅ **Health Check**:
```
https://your-app.vercel.app/health
```

Expected response:
```json
{
  "success": true,
  "message": "Uqudo Admin Portal API is running",
  "timestamp": "2026-01-16T...",
  "version": "1.0.0"
}
```

✅ **Login Page**:
```
https://your-app.vercel.app/pages/uqudo-sign-in
```

✅ **API Test** (requires authentication):
```
https://your-app.vercel.app/api/dashboard/kpis
```

### 3. Configure Uqudo SDK Webhook

Update your Uqudo SDK webhook URL to:
```
https://your-app.vercel.app/api/sdk-verification/enrollment
```

## How It Works

### Monorepo Architecture

The `vercel.json` configuration deploys both frontend and backend as serverless functions:

```json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/server.js" },  // API routes → backend
    { "src": "/(.*)", "dest": "server.js" }               // Pages → frontend
  ]
}
```

### API Client Auto-Detection

The API client automatically uses the correct base URL:

```javascript
// Production: https://your-app.vercel.app/api
// Local: http://localhost:3000/api
```

No manual configuration needed!

## Troubleshooting

### Issue: API returns 404

**Solution**: Check that `vercel.json` routes are configured correctly. API routes should point to `backend/server.js`.

### Issue: CORS errors

**Solution**:
1. Verify `CORS_ORIGIN` environment variable
2. Update Supabase CORS settings
3. Redeploy with `vercel --prod`

### Issue: Database connection fails

**Solution**:
1. Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Verify Supabase project is active
3. Check IP restrictions in Supabase settings

### Issue: JWT authentication fails

**Solution**:
1. Ensure `JWT_SECRET` is set in Vercel
2. Secret must be at least 32 characters
3. Clear browser localStorage and try again

## Monitoring

View deployment status and logs:

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Function Logs**: Click on deployment → "Logs" tab
- **Real-time Logs**: Click "View Function Logs"

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add domain (e.g., `admin.uqudo.com`)
3. Configure DNS records as instructed by Vercel
4. Update `CORS_ORIGIN` environment variable
5. Redeploy

## Next Steps

After successful deployment:

1. ✅ Test login functionality
2. ✅ Create test account manually
3. ✅ Create test case with alerts
4. ✅ Upload sample blocklist CSV
5. ✅ Test SDK enrollment endpoint with cURL
6. ✅ Configure Uqudo SDK webhook URL

## Cost

**Vercel Free Tier** includes:
- 100 GB bandwidth/month
- 100 hours serverless execution/month
- Automatic HTTPS
- Continuous deployment from Git

Sufficient for testing and small-scale production use.

## Support

- **Deployment Issues**: See `DEPLOYMENT_GUIDE.md`
- **API Integration**: See `UQUDO_SDK_INTEGRATION.md`
- **General Help**: See `README_UQUDO.md`

---

**Status**: Ready to deploy ✅
**Estimated Time**: 5-10 minutes
**Next Command**: `vercel`
