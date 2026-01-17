# Deployment Checklist

## 📋 Pre-Deployment

### ✅ Files Ready
- [x] `vercel.json` - Routing configuration
- [x] `.vercelignore` - Exclude files
- [x] `backend/server.js` - API server with SDK endpoints
- [x] `backend/routes/sdk-verification-jws.js` - JWS endpoint
- [x] All documentation files created
- [x] API documentation updated

### ✅ Code Changes
- [x] SDK JWS endpoint implemented
- [x] Automatic account/alert/case creation
- [x] 405 error debugging added
- [x] CORS configuration set
- [x] Multiple endpoint URLs for flexibility

---

## 🚀 Step 1: Push to GitHub

### Using GitHub Desktop:

1. **Open GitHub Desktop**

2. **Review Changes** - You should see:
   ```
   Modified:
   - .gitignore
   - assets/API_DOCUMENTATION.md
   - backend/server.js

   New files:
   - backend/routes/sdk-verification-jws.js
   - UQUDO_SDK_JWS_INTEGRATION.md
   - SDK_ENDPOINTS_SUMMARY.md
   - SDK_MOBILE_405_FIX.md
   - MOBILE_URL_FIX.md
   - DEPLOY_TO_VERCEL.md
   - DEPLOYMENT_CHECKLIST.md
   - COMMIT_MESSAGE.txt
   ```

3. **Commit Message** (copy from COMMIT_MESSAGE.txt):
   ```
   Add SDK JWS endpoint and prepare for Vercel deployment
   ```

4. **Click "Commit to main"**

5. **Click "Push origin"** to push to GitHub

### ✅ Verify Push
- [ ] Check GitHub repository to confirm changes are pushed

---

## 🌐 Step 2: Deploy to Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to**: https://vercel.com/new

2. **Import Git Repository**
   - Select your GitHub account
   - Find your repository
   - Click "Import"

3. **Configure Project**
   - Project Name: `uqudo-admin-portal` (or your choice)
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: (leave default)
   - Output Directory: (leave default)

4. **Environment Variables** - Click "Add" for each:

   **Required:**
   ```
   NODE_ENV = production
   SUPABASE_URL = https://your-project.supabase.co
   SUPABASE_ANON_KEY = your-anon-key
   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
   JWT_SECRET = your-super-secret-min-32-chars
   JWT_REFRESH_SECRET = your-refresh-secret
   CORS_ORIGIN = *
   ```

   **Get Supabase keys:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Settings → API
   - Copy URL and service_role key

5. **Click "Deploy"**

6. **Wait 2-3 minutes** for build to complete

7. **Get Your URL** - Vercel will show:
   ```
   ✅ https://uqudo-admin-portal.vercel.app
   ```

### Method 2: Via Vercel CLI

```bash
# Install CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
vercel

# Deploy to production
vercel --prod
```

### ✅ Deployment Complete
- [ ] Build succeeded
- [ ] Deployment URL obtained
- [ ] Copy your actual URL: `_______________________________`

---

## 🧪 Step 3: Test Deployment

### Test 1: Health Check
```bash
curl https://YOUR-ACTUAL-URL.vercel.app/health
```

**Expected:**
```json
{
  "success": true,
  "message": "Uqudo Admin Portal API is running",
  "timestamp": "...",
  "version": "1.0.0"
}
```

- [ ] Health check returns 200

### Test 2: SDK Endpoint
```bash
curl -X POST https://YOUR-ACTUAL-URL.vercel.app/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -d '{"token":"test-token"}'
```

**Expected:** 400 (invalid token format - this is correct!)
```json
{
  "success": false,
  "error": "Invalid JWS token format"
}
```

- [ ] SDK endpoint returns 400 (not 404 or 405)

### Test 3: Admin Portal
Open in browser:
```
https://YOUR-ACTUAL-URL.vercel.app/pages/uqudo-sign-in
```

- [ ] Login page loads
- [ ] Can login with credentials
- [ ] Dashboard displays

### ✅ All Tests Passed
- [ ] All 3 tests completed successfully

---

## 📱 Step 4: Update Mobile App

### Update SDK Configuration

Replace the placeholder URL with your actual Vercel URL.

**Before:**
```
https://your-app.vercel.app/api/sdk-verification/enrollment-jws
```

**After (use your actual URL from Step 2):**
```
https://YOUR-ACTUAL-URL.vercel.app/api/sdk-verification/enrollment-jws
```

**Android (Kotlin):**
```kotlin
UqudoSDKConfig.Builder()
    .setWebhookUrl("https://YOUR-ACTUAL-URL.vercel.app/api/sdk-verification/enrollment-jws")
    .build()
```

**iOS (Swift):**
```swift
let config = UqudoSDKConfiguration()
config.webhookURL = "https://YOUR-ACTUAL-URL.vercel.app/api/sdk-verification/enrollment-jws"
```

### ✅ Mobile App Updated
- [ ] URL updated in mobile app
- [ ] Mobile app rebuilt

---

## 🔍 Step 5: Test from Mobile

### Test SDK Submission

1. **Run mobile app**
2. **Complete KYC enrollment**
3. **Submit SDK results**

### Expected Results:
- ✅ No 405 error
- ✅ Account created in database
- ✅ Alert created (if background check match)
- ✅ Case created (if background check match)

### Verify in Admin Portal:
1. Login to: `https://YOUR-ACTUAL-URL.vercel.app/pages/uqudo-sign-in`
2. Check **Accounts page** - New account should appear
3. Check **Alerts page** - Alert should appear (if match found)
4. Check **Cases page** - Case should appear (if match found)

### ✅ Mobile Integration Working
- [ ] SDK submits successfully
- [ ] Account appears in portal
- [ ] Alert/case created (if applicable)

---

## 🔧 Step 6: Configure Production Settings (Optional)

### Update CORS (if needed)

If you want to restrict CORS to your domain only:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://YOUR-ACTUAL-URL.vercel.app
   ```
3. Click "Save"
4. Redeploy (Vercel → Deployments → Latest → ⋯ → Redeploy)

- [ ] CORS configured (if needed)

### Update Supabase CORS

1. Go to Supabase Dashboard → Settings → API
2. Scroll to "CORS Settings"
3. Add your Vercel URLs:
   ```
   https://YOUR-ACTUAL-URL.vercel.app
   https://YOUR-ACTUAL-URL-*.vercel.app
   ```
4. Click "Save"

- [ ] Supabase CORS configured

### Add Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add domain (e.g., `admin.uqudo.com`)
3. Configure DNS as instructed
4. Update mobile app URL to custom domain

- [ ] Custom domain added (optional)

---

## ✅ Deployment Complete!

### Your URLs:

**Production URL:**
```
https://_______________________________.vercel.app
```

**Admin Portal:**
```
https://_______________________________.vercel.app/pages/uqudo-sign-in
```

**SDK Endpoint:**
```
https://_______________________________.vercel.app/api/sdk-verification/enrollment-jws
```

### Next Steps:

1. ✅ Application deployed
2. ✅ Mobile app configured with correct URL
3. ✅ SDK integration working
4. ✅ Accounts/alerts/cases created automatically

### Monitoring:

**Vercel Dashboard:**
- Functions logs: Vercel Dashboard → Your Project → Functions
- Analytics: Vercel Dashboard → Your Project → Analytics

**Supabase Dashboard:**
- Database: Your Supabase Project → Database
- Logs: Your Supabase Project → Logs

---

## 🆘 Troubleshooting

### If Build Fails:
- Check Vercel build logs
- Verify environment variables
- See: `/DEPLOY_TO_VERCEL.md`

### If 405 Error:
- Verify using correct URL (not placeholder)
- Check mobile app URL configuration
- See: `/SDK_MOBILE_405_FIX.md`

### If Database Error:
- Verify Supabase environment variables
- Check Supabase project is active
- Verify service role key (not anon key)

### If CORS Error:
- Set `CORS_ORIGIN=*` in Vercel
- Add Vercel URLs to Supabase CORS
- Redeploy

---

## 📚 Documentation

All documentation available in project:

- `/DEPLOY_TO_VERCEL.md` - Complete deployment guide
- `/UQUDO_SDK_JWS_INTEGRATION.md` - SDK integration
- `/SDK_ENDPOINTS_SUMMARY.md` - Endpoint reference
- `/SDK_MOBILE_405_FIX.md` - 405 error troubleshooting
- `/MOBILE_URL_FIX.md` - URL configuration
- `/README_UQUDO.md` - Project overview

---

**Status**: Ready to deploy! 🚀
**Next Action**: Push to GitHub using GitHub Desktop
