# Deploy to Vercel - Manual Steps

Since Vercel CLI requires interactive authentication, please follow these manual deployment steps.

## Option 1: Deploy via Vercel Web Interface (Easiest) ⭐

### Step 1: Create GitHub Repository (Optional but Recommended)

```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master

# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Uqudo Admin Portal ready for deployment"

# Create repository on GitHub first, then:
git remote add origin https://github.com/YOUR-USERNAME/uqudo-admin-portal.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy via Vercel Website

1. **Go to Vercel**: https://vercel.com/new

2. **Import Git Repository**:
   - Click "Import Git Repository"
   - Select your GitHub account
   - Choose the repository you just created
   - Click "Import"

3. **Configure Project**:
   - **Project Name**: `uqudo-admin-portal` (or your choice)
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: Leave default
   - **Output Directory**: Leave default

4. **Environment Variables** (Click "Environment Variables"):

   Add these **required** variables for all environments (Production, Preview, Development):

   ```
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
   JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-characters
   CORS_ORIGIN=https://uqudo-admin-portal.vercel.app
   ```

   Optional variables:
   ```
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete (2-5 minutes)
   - Get your deployment URL

6. **Update CORS**:
   - Copy your Vercel URL (e.g., `https://uqudo-admin-portal.vercel.app`)
   - Go back to Environment Variables
   - Update `CORS_ORIGIN` with your actual Vercel URL
   - Redeploy (click "Redeploy" button in Deployments tab)

7. **Update Supabase CORS**:
   - Go to Supabase Dashboard → Settings → API
   - Add to allowed origins:
     ```
     https://uqudo-admin-portal.vercel.app
     https://uqudo-admin-portal-*.vercel.app
     ```

---

## Option 2: Deploy via CLI (Without Global Install)

### Step 1: Navigate to Project

```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
```

### Step 2: Run Deployment Script

**Option A: Use the script I created**:
```bash
./deploy.sh
```

**Option B: Use npx directly**:
```bash
# Login (one-time only)
npx vercel login

# Deploy to preview
npx vercel

# After testing, deploy to production
npx vercel --prod
```

### Step 3: Follow Prompts

When you run `npx vercel`, you'll be asked:

1. **"Set up and deploy?"** → Yes
2. **"Which scope?"** → Choose your account
3. **"Link to existing project?"** → No
4. **"What's your project's name?"** → `uqudo-admin-portal`
5. **"In which directory is your code located?"** → `./` (press Enter)
6. **"Want to override the settings?"** → No

### Step 4: Configure Environment Variables

After deployment, go to Vercel Dashboard:
- https://vercel.com/dashboard
- Select your project
- Go to Settings → Environment Variables
- Add all required variables (see list above)
- Redeploy

---

## Option 3: Deploy via Vercel CLI with Global Install

If you have sudo access, run:

```bash
sudo npm install -g vercel
vercel login
vercel
vercel --prod
```

---

## Post-Deployment Checklist

After deployment, verify these:

### 1. Health Check
```bash
curl https://your-app.vercel.app/health
```

Expected response:
```json
{
  "success": true,
  "message": "Uqudo Admin Portal API is running",
  "version": "1.0.0"
}
```

### 2. Login Page
Visit: `https://your-app.vercel.app/pages/uqudo-sign-in`

Should load the login page.

### 3. API Endpoint Test
After logging in, test:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-app.vercel.app/api/dashboard/kpis
```

### 4. Update Uqudo SDK Webhook

Configure your Uqudo SDK webhook URL:
```
https://your-app.vercel.app/api/sdk-verification/enrollment
```

---

## Environment Variables Reference

### Required (Must Configure)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-super-secret-key-here-min-32` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | `another-secret-key-for-refresh` |
| `CORS_ORIGIN` | Your Vercel deployment URL | `https://uqudo-admin-portal.vercel.app` |

### Optional (Default Values Provided)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `JWT_EXPIRES_IN` | JWT token lifetime | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

---

## Troubleshooting

### Issue: "Route not found" errors

**Solution**: Ensure `vercel.json` is in the project root with correct routes configuration.

### Issue: CORS errors in browser

**Solution**:
1. Check `CORS_ORIGIN` environment variable is set correctly
2. Update Supabase CORS settings
3. Redeploy after changes

### Issue: Database connection fails

**Solution**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Check Supabase project is active
3. Review Vercel function logs for detailed error

### Issue: Environment variables not working

**Solution**:
1. Ensure variables are added for **all three environments**:
   - Production ✓
   - Preview ✓
   - Development ✓
2. Redeploy after adding variables
3. Check spelling and no extra spaces

---

## Viewing Logs

### Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click on a deployment
4. Click "Logs" tab
5. View real-time function logs

### CLI Logs
```bash
npx vercel logs
```

---

## Custom Domain Setup (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `admin.uqudo.com`)
4. Follow DNS configuration instructions
5. Update `CORS_ORIGIN` environment variable with new domain
6. Redeploy

---

## Redeploying After Changes

### Via Git (Automatic)
```bash
git add .
git commit -m "Update: description"
git push origin main
```
Vercel automatically deploys on every push.

### Via CLI
```bash
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod
```

### Via Dashboard
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Project Docs**: See `DEPLOYMENT_GUIDE.md` for detailed information
- **SDK Integration**: See `UQUDO_SDK_INTEGRATION.md`

---

## Quick Command Reference

```bash
# Deploy preview
npx vercel

# Deploy production
npx vercel --prod

# View deployments
npx vercel ls

# View logs
npx vercel logs

# View domains
npx vercel domains ls

# Remove deployment
npx vercel remove [deployment-url]
```

---

## Next Steps After Successful Deployment

1. ✅ Test login with existing credentials
2. ✅ Create a test account manually
3. ✅ Create a test alert
4. ✅ Create a test case with alert linking
5. ✅ Upload sample blocklist CSV
6. ✅ Test SDK enrollment endpoint
7. ✅ Configure Uqudo SDK webhook URL
8. ✅ Set up custom domain (optional)
9. ✅ Enable deployment notifications

---

**Status**: Ready to Deploy! 🚀

**Recommended Method**: Option 1 (Vercel Web Interface) - Easiest and most reliable

**Estimated Time**: 10-15 minutes

**Start Here**: https://vercel.com/new
