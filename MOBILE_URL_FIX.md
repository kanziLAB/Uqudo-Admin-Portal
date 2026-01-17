# Fixing Mobile App URL - 405 Error

## Problem

Mobile app is sending to: `https://your-app.vercel.app/api/sdk-verification/enrollment-jws`

This is a **placeholder URL** from documentation examples. You need to use your **actual deployment URL**.

## Solution: Use Your Real URL

### ✅ Option 1: Use Deployed Vercel URL (Recommended)

If you've already deployed to Vercel:

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Copy your deployment URL (looks like: `https://your-project-name.vercel.app`)
4. Update mobile app configuration to:
   ```
   https://your-actual-project.vercel.app/api/sdk-verification/enrollment-jws
   ```

**Example:**
```
// Replace this placeholder:
https://your-app.vercel.app/api/sdk-verification/enrollment-jws

// With your actual URL:
https://uqudo-admin-portal-abc123.vercel.app/api/sdk-verification/enrollment-jws
```

---

### ✅ Option 2: Deploy to Vercel Now (5 minutes)

If you haven't deployed yet:

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Login to Vercel**
```bash
vercel login
```

**Step 3: Deploy**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
vercel
```

**Step 4: Get Your URL**
After deployment, Vercel will show:
```
✅ Production: https://uqudo-admin-portal.vercel.app
```

**Step 5: Update Mobile App**
Use the URL from step 4:
```
https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws
```

**Step 6: Configure Environment Variables**
In Vercel dashboard → Settings → Environment Variables, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN=*` (or your specific domain)

**Step 7: Redeploy**
```bash
vercel --prod
```

---

### ✅ Option 3: Test Locally with ngrok (Quick Testing)

If you want to test from mobile while backend runs locally:

**Step 1: Install ngrok**
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

**Step 2: Start Backend Locally**
```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master/backend"
npm start
```

**Step 3: Expose Port 3000**
```bash
ngrok http 3000
```

**Step 4: Get ngrok URL**
ngrok will display:
```
Forwarding: https://abc123xyz.ngrok.io -> http://localhost:3000
```

**Step 5: Update Mobile App (Temporary)**
Use the ngrok URL:
```
https://abc123xyz.ngrok.io/api/sdk-verification/enrollment-jws
```

**⚠️ Note:** ngrok URLs change every time you restart ngrok. This is only for testing.

---

## Quick Test: Verify URL Works

After setting the correct URL, test it:

```bash
# Replace YOUR_ACTUAL_URL with your real URL
curl -X POST https://YOUR_ACTUAL_URL/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -d '{"token":"test-token"}' \
  -v
```

**Expected Response:**
```
< HTTP/1.1 400 Bad Request
{
  "success": false,
  "error": "Invalid JWS token format"
}
```

**✅ Good**: 400 means endpoint is working (invalid token is expected)
**❌ Bad**: 405 means wrong URL or method
**❌ Bad**: 404 means URL not found

---

## Available Endpoints

Once you have your actual URL, these endpoints are available:

### Primary (Recommended)
```
POST https://YOUR-ACTUAL-URL/api/sdk-verification/enrollment-jws
```

### Alternative (Shorter)
```
POST https://YOUR-ACTUAL-URL/api/sdk-verification/jws
```

### Legacy (Backward Compatible)
```
POST https://YOUR-ACTUAL-URL/api/sdk-verification/enrollment
```

---

## Mobile App Configuration

Update your Uqudo SDK configuration:

```kotlin
// Android
UqudoSDKConfig.Builder()
    .setWebhookUrl("https://YOUR-ACTUAL-URL/api/sdk-verification/enrollment-jws")
    .build()
```

```swift
// iOS
let config = UqudoSDKConfiguration()
config.webhookURL = "https://YOUR-ACTUAL-URL/api/sdk-verification/enrollment-jws"
```

---

## Checklist

Before testing from mobile:

- [ ] Replace `your-app.vercel.app` with actual URL
- [ ] Ensure URL includes `/api` prefix
- [ ] Ensure URL ends with `/enrollment-jws`
- [ ] Full URL format: `https://DOMAIN/api/sdk-verification/enrollment-jws`
- [ ] Test URL with cURL (should return 400, not 405)
- [ ] Backend is deployed and running
- [ ] Environment variables configured (if using Vercel)

---

## Common Mistakes

### ❌ Using Placeholder URL
```
https://your-app.vercel.app/api/sdk-verification/enrollment-jws
```
**Fix:** Replace with actual deployment URL

### ❌ Missing /api Prefix
```
https://my-domain.com/sdk-verification/enrollment-jws
```
**Fix:** Add `/api`:
```
https://my-domain.com/api/sdk-verification/enrollment-jws
```

### ❌ Wrong Port (Local Testing)
```
http://localhost:8080/api/sdk-verification/enrollment-jws
```
**Fix:** Use port 3000 (backend):
```
http://localhost:3000/api/sdk-verification/enrollment-jws
```

### ❌ Using Local URL from Mobile
```
http://localhost:3000/api/sdk-verification/enrollment-jws
```
**Fix:** Mobile can't reach localhost. Use ngrok or deploy to Vercel

---

## Example URLs (Replace with Yours)

**Production (Vercel):**
```
https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws
```

**Custom Domain:**
```
https://admin.uqudo.com/api/sdk-verification/enrollment-jws
```

**Local + ngrok (Testing):**
```
https://abc123xyz.ngrok.io/api/sdk-verification/enrollment-jws
```

**Local (Desktop/Postman only):**
```
http://localhost:3000/api/sdk-verification/enrollment-jws
```

---

## Next Steps

1. **Determine your deployment method:**
   - Already deployed? → Get URL from Vercel dashboard
   - Not deployed? → Deploy now with `vercel`
   - Testing only? → Use ngrok

2. **Get the actual URL**

3. **Update mobile app configuration** with the real URL

4. **Test with cURL** to verify endpoint works

5. **Test from mobile app**

6. **Check backend logs** if still having issues

---

## Support

If still getting 405 after using correct URL:

1. Share the **actual URL** you're using
2. Share the **cURL test result**
3. Share the **backend logs** from `/tmp/backend-debug.log`

The placeholder `your-app.vercel.app` was just an example in the documentation - you must replace it with your real deployment URL!

---

**Status**: ✅ Issue identified - using placeholder URL instead of actual deployment URL
**Action Required**: Update mobile app with your real Vercel URL or deploy to Vercel first
