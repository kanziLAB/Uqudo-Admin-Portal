# Add Environment Variables to Vercel - Step by Step

## 🎯 5-Minute Setup

Follow these exact steps to add the required environment variables.

---

## Step 1: Open Vercel Dashboard

**Click this link**: https://vercel.com/dashboard

- Find your project: **Uqudo-Admin-Portal** (or similar name)
- Click on the project name

---

## Step 2: Go to Environment Variables

Once in your project:

1. Click **"Settings"** tab at the top
2. In the left sidebar, click **"Environment Variables"**
3. You'll see a list of existing variables (from Supabase integration)

---

## Step 3: Add Each Variable

Click the **"Add Environment Variable"** button and add these **one by one**:

---

### Variable 1: JWT_SECRET

```
Name (Key):
JWT_SECRET

Value:
shiV9eFZ23W30UtQNGaGAuv08WF9BQ848Px+jjwZ6Q0=

Environments (select ALL three):
☑️ Production
☑️ Preview
☑️ Development
```

**Click "Save"**

---

### Variable 2: JWT_REFRESH_SECRET

```
Name (Key):
JWT_REFRESH_SECRET

Value:
uB/AxiG/EnWRvHAdnU/HkQBQQyA854GFprzYuTNUJA4=

Environments (select ALL three):
☑️ Production
☑️ Preview
☑️ Development
```

**Click "Save"**

---

### Variable 3: NODE_ENV

```
Name (Key):
NODE_ENV

Value:
production

Environments (select ALL three):
☑️ Production
☑️ Preview
☑️ Development
```

**Click "Save"**

---

### Variable 4: CORS_ORIGIN (IMPORTANT - Update This Later!)

```
Name (Key):
CORS_ORIGIN

Value:
https://uqudo-admin-portal.vercel.app

Environments (select ALL three):
☑️ Production
☑️ Preview
☑️ Development
```

**Click "Save"**

⚠️ **NOTE**: After your first deployment, you MUST come back and update this with your actual Vercel URL!

---

### Variable 5: Check SUPABASE_SERVICE_ROLE_KEY

**Look in your existing variables** - do you see `SUPABASE_SERVICE_ROLE_KEY`?

- ✅ **If YES**: Skip this step, you're good!
- ❌ **If NO**: You need to add it manually

#### To Add SUPABASE_SERVICE_ROLE_KEY:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings → API**
4. Find **"service_role key"** section
5. Click **"Reveal"** button
6. Copy the key
7. Back in Vercel, add:

```
Name (Key):
SUPABASE_SERVICE_ROLE_KEY

Value:
[paste the key you copied from Supabase]

Environments (select ALL three):
☑️ Production
☑️ Preview
☑️ Development
```

**Click "Save"**

---

## Step 4: Verify Your Variables

After adding all variables, you should see at least these in your list:

- ✅ `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `JWT_SECRET`
- ✅ `JWT_REFRESH_SECRET`
- ✅ `CORS_ORIGIN`
- ✅ `NODE_ENV`

---

## Step 5: Redeploy

After adding all variables:

1. Click **"Deployments"** tab at the top
2. Find the most recent deployment
3. Click the **"..." (three dots)** button on the right
4. Click **"Redeploy"**
5. Confirm by clicking **"Redeploy"** again
6. Wait 2-5 minutes for deployment to complete

---

## Step 6: Get Your Deployment URL

After deployment completes:

1. Click on the deployment to open it
2. At the top, you'll see your URL (e.g., `https://uqudo-admin-portal-abc123.vercel.app`)
3. **Copy this URL** - you'll need it for the next step

---

## Step 7: Update CORS_ORIGIN

Now that you have your real URL:

1. Go back to **Settings → Environment Variables**
2. Find **`CORS_ORIGIN`**
3. Click **"Edit"** (pencil icon)
4. **Replace** the value with your actual Vercel URL from Step 6
5. Make sure all three environments are still selected
6. Click **"Save"**

---

## Step 8: Redeploy Again

One more time to apply the CORS change:

1. **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait 2-5 minutes

---

## Step 9: Update Supabase CORS

Final step - allow Supabase to accept requests from your Vercel URL:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings → API**
4. Scroll down to **"CORS"** section
5. Add your Vercel URL to allowed origins:
   ```
   https://uqudo-admin-portal-abc123.vercel.app
   https://uqudo-admin-portal-*.vercel.app
   ```
6. Click **"Save"**

---

## Step 10: Test Your Deployment

1. Open your Vercel URL in a browser
2. You should see the login page
3. Try to login with your credentials
4. If it works - **SUCCESS!** 🎉

---

## 🎬 Visual Guide

### Where to Find Environment Variables:

```
Vercel Dashboard
  └── Your Project (Uqudo-Admin-Portal)
      └── Settings (top tab)
          └── Environment Variables (left sidebar)
              └── "Add Environment Variable" button
```

### What Each Field Looks Like:

```
┌─────────────────────────────────────┐
│ Add Environment Variable            │
├─────────────────────────────────────┤
│ Name                                │
│ [JWT_SECRET                      ]  │
│                                     │
│ Value                               │
│ [shiV9eFZ23W30UtQNGa...         ]  │
│                                     │
│ Environments:                       │
│ ☑️ Production                       │
│ ☑️ Preview                          │
│ ☑️ Development                      │
│                                     │
│           [Cancel]  [Save]          │
└─────────────────────────────────────┘
```

---

## 📋 Quick Copy-Paste Values

Have these ready to copy-paste:

**JWT_SECRET:**
```
shiV9eFZ23W30UtQNGaGAuv08WF9BQ848Px+jjwZ6Q0=
```

**JWT_REFRESH_SECRET:**
```
uB/AxiG/EnWRvHAdnU/HkQBQQyA854GFprzYuTNUJA4=
```

**NODE_ENV:**
```
production
```

**CORS_ORIGIN (initial - update later):**
```
https://uqudo-admin-portal.vercel.app
```

---

## ⏱️ Time Estimate

- Adding variables: **3 minutes**
- First deployment: **2-5 minutes**
- Updating CORS_ORIGIN: **1 minute**
- Second deployment: **2-5 minutes**
- Updating Supabase CORS: **1 minute**

**Total: ~15 minutes**

---

## 🚨 Common Issues

### Issue: Can't find "Add Environment Variable" button

**Solution**:
- Make sure you're in Settings tab
- Click "Environment Variables" in left sidebar
- Button should be at the top right

### Issue: Deployment fails after adding variables

**Solution**:
- Check all variables are saved
- Verify no typos in variable names
- Make sure all three environments are selected
- Check Vercel function logs for specific errors

### Issue: CORS error after deployment

**Solution**:
1. Verify `CORS_ORIGIN` has your actual Vercel URL (no trailing slash)
2. Redeploy after updating
3. Update Supabase CORS settings
4. Clear browser cache and try again

### Issue: Login doesn't work

**Solution**:
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are added
- Check Supabase connection (test in Supabase dashboard)
- Look at Vercel function logs for errors
- Verify user exists in Supabase `user_credentials` table

---

## ✅ Final Checklist

Before testing:

- [ ] Added `JWT_SECRET`
- [ ] Added `JWT_REFRESH_SECRET`
- [ ] Added `NODE_ENV`
- [ ] Added `CORS_ORIGIN` (with actual URL)
- [ ] Verified `SUPABASE_SERVICE_ROLE_KEY` exists
- [ ] All variables have all 3 environments selected
- [ ] Redeployed after adding variables
- [ ] Updated CORS_ORIGIN with real URL
- [ ] Redeployed again
- [ ] Updated Supabase CORS settings

---

## 🎯 Ready? Let's Do This!

**Start here**: https://vercel.com/dashboard

1. Open your project
2. Settings → Environment Variables
3. Add the 4 variables above
4. Redeploy
5. Update CORS_ORIGIN
6. Redeploy again
7. Done! 🚀

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs/concepts/projects/environment-variables
- Check `VERCEL_SUPABASE_INTEGRATION.md` for more details

**Time to Deploy**: ~15 minutes
**Difficulty**: Easy (just copy-paste!)
**Status**: Ready to go! ✅
