# Vercel Deployment Guide - Uqudo Admin Portal

This guide explains how to deploy your Uqudo Admin Portal to Vercel.

## Architecture

The application consists of:
- **Frontend**: Express server serving static files (port 8080 locally)
- **Backend**: Express API server (port 3000 locally)
- **Database**: Supabase PostgreSQL

## Deployment Strategy

We'll deploy as a **monorepo** with both frontend and backend serverless functions on Vercel.

## Prerequisites

1. ✅ Vercel account (sign up at https://vercel.com)
2. ✅ Supabase project with database configured
3. ✅ Git repository (optional but recommended)

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Prepare Environment Variables

You'll need to configure these environment variables in Vercel:

### Required Variables:

```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=https://your-app.vercel.app
```

### Optional Variables:

```bash
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE_MB=100
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,xls,xlsx,csv
LOG_LEVEL=info
```

## Step 3: Update API Client Configuration

Before deploying, you need to update the API client to use the production backend URL.

**Option A: Environment Variable (Recommended)**

Update `/assets/js/api-client.js` line 6:

```javascript
constructor(baseURL = window.VITE_API_BASE_URL || 'http://localhost:3000/api') {
  this.baseURL = baseURL;
  this.token = this.getToken();
}
```

Then add to your HTML files (before api-client.js):

```html
<script>
  window.VITE_API_BASE_URL = 'https://your-app.vercel.app/api';
</script>
```

**Option B: Direct URL**

Update `/assets/js/api-client.js` line 6:

```javascript
constructor(baseURL = 'https://your-app.vercel.app/api') {
```

## Step 4: Deploy to Vercel

### Method 1: Deploy via Vercel CLI (Quick)

```bash
# Navigate to project directory
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? uqudo-admin-portal
# - Directory? ./
# - Override settings? No
```

### Method 2: Deploy via Git (Recommended for Production)

1. **Push to GitHub/GitLab/Bitbucket**:

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
   - Vercel will auto-detect the configuration from `vercel.json`

3. **Configure Environment Variables**:
   - In Vercel dashboard → Settings → Environment Variables
   - Add all required variables from Step 2
   - Make sure to add them for **Production**, **Preview**, and **Development** environments

## Step 5: Configure Supabase CORS

After deployment, update your Supabase CORS settings:

1. Go to Supabase Dashboard → Settings → API
2. Add your Vercel URL to allowed origins:
   ```
   https://your-app.vercel.app
   https://your-app-*.vercel.app
   ```

## Step 6: Update Frontend Configuration

After deployment, get your Vercel URL (e.g., `https://uqudo-admin-portal.vercel.app`) and:

1. Update `CORS_ORIGIN` in Vercel environment variables:
   ```
   CORS_ORIGIN=https://uqudo-admin-portal.vercel.app
   ```

2. Redeploy to apply changes:
   ```bash
   vercel --prod
   ```

## Step 7: Verify Deployment

Test the following:

1. **Health Check**:
   ```
   https://your-app.vercel.app/health
   ```
   Should return:
   ```json
   {
     "success": true,
     "message": "Uqudo Admin Portal API is running",
     "timestamp": "2024-...",
     "version": "1.0.0"
   }
   ```

2. **Login Page**:
   ```
   https://your-app.vercel.app/pages/uqudo-sign-in
   ```

3. **API Endpoints** (after login):
   ```
   https://your-app.vercel.app/api/dashboard
   https://your-app.vercel.app/api/accounts
   ```

## Troubleshooting

### Issue: 404 on API routes

**Solution**: Ensure `vercel.json` routes are configured correctly. The API routes should be routed to `backend/server.js`.

### Issue: CORS errors

**Solution**:
1. Check `CORS_ORIGIN` environment variable includes your Vercel URL
2. Update Supabase CORS settings
3. Redeploy after changes

### Issue: Database connection errors

**Solution**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
2. Check Supabase project is active
3. Verify IP restrictions in Supabase settings allow Vercel IPs

### Issue: JWT authentication fails

**Solution**:
1. Ensure `JWT_SECRET` is set in Vercel environment variables
2. Secret must be at least 32 characters
3. Match the secret used to generate existing tokens

### Issue: Static files not loading

**Solution**:
1. Check asset paths in HTML files use relative paths
2. Verify `/assets` route in `vercel.json`
3. Clear browser cache

## Post-Deployment Tasks

1. ✅ Test login functionality
2. ✅ Verify all pages load correctly
3. ✅ Test account creation
4. ✅ Test case creation with alerts
5. ✅ Test blocklist CSV upload
6. ✅ Test SDK verification endpoint (POST to `/api/sdk-verification/enrollment`)
7. ✅ Configure Uqudo SDK webhook to point to your Vercel URL

## Monitoring

Monitor your deployment:

1. **Vercel Dashboard**: https://vercel.com/dashboard
   - View deployment logs
   - Check function execution times
   - Monitor bandwidth usage

2. **Supabase Dashboard**: Your Supabase project
   - Monitor database queries
   - Check API usage
   - View logs

## Updating the Deployment

### Via CLI:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Via Git:

```bash
git add .
git commit -m "Update: description of changes"
git push origin main
```

Vercel will automatically deploy on every push to main.

## Custom Domain (Optional)

To use a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `admin.uqudo.com`)
3. Configure DNS records as instructed
4. Update `CORS_ORIGIN` environment variable with new domain
5. Redeploy

## Security Considerations

1. ✅ **Environment Variables**: Never commit `.env` file to Git
2. ✅ **JWT Secrets**: Use strong, random secrets (min 32 characters)
3. ✅ **CORS**: Only whitelist your actual frontend URLs
4. ✅ **Rate Limiting**: Enabled by default (100 requests per 15 minutes)
5. ✅ **HTTPS**: Automatic with Vercel
6. ✅ **Supabase RLS**: Ensure Row Level Security policies are configured

## Cost Estimation

**Vercel Free Tier includes**:
- 100 GB bandwidth per month
- 100 hours serverless function execution
- Automatic HTTPS
- Continuous deployment

**Upgrade needed if**:
- High traffic (>100 GB/month)
- Many long-running API calls
- Need team collaboration features

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: Check browser console and Vercel logs

---

**Deployment Status**: Ready to deploy
**Configuration Files**: ✅ Created (`vercel.json`, `.vercelignore`, `.env.example`)
**Next Step**: Run `vercel` command to deploy
