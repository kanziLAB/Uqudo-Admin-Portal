# 🚀 Final Deployment Steps - Complete Guide

## Current Status

✅ **Code Implementation**: All features are implemented and ready
- SDK version display (Mobile/Web/Manual)
- Smart status with AML and score checks
- Face image integration with OAuth2 authentication
- Performance Journey with real SDK analytics
- Case modal overflow fixed

❌ **Database Migrations**: Need to be executed manually in Supabase
❌ **Environment Variables**: Need to be added to Vercel
❌ **Code Deployment**: Ready to push to GitHub

---

## Step 1: Execute Database Migrations (5 minutes)

### Why Manual Execution is Required

The Supabase REST API doesn't expose a public `exec_sql` function, so we need to run the SQL migrations manually in the Supabase SQL Editor. This is a one-time operation that adds 9 new columns and 2 indexes to the `accounts` table.

### Instructions

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in if prompted
   - Select project: **kpmcigujptbolpdlfojo**

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query** button

3. **Copy Migration SQL**
   - Open file: `COMBINED_MIGRATION.sql` in your code editor
   - Select ALL content (Cmd+A or Ctrl+A)
   - Copy (Cmd+C or Ctrl+C)

4. **Paste and Execute**
   - Paste into Supabase SQL Editor (Cmd+V or Ctrl+V)
   - Click **Run** button (or press Ctrl+Enter)
   - Wait for execution to complete (~5 seconds)

5. **Verify Success**
   You should see output showing:
   ```
   ✅ 9 rows returned (9 columns added)
   ✅ 2 rows returned (2 indexes created)
   ✅ Statistics showing counts
   ```

### What This Adds

**SDK Analytics Columns** (for Performance Journey):
- `sdk_source` (JSONB) - SDK type, version, device info
- `sdk_verifications` (JSONB) - Verification results
- `sdk_documents` (JSONB) - Document data
- `sdk_analytics` (JSONB) - Analytics events array

**Face Images Columns** (for visual identification):
- `face_image_url` (TEXT) - URL to face selfie
- `face_image_base64` (TEXT) - Base64 encoded image
- `document_front_url` (TEXT) - Document front URL
- `document_back_url` (TEXT) - Document back URL
- `images_fetched_at` (TIMESTAMP) - Fetch timestamp

**Indexes** (for performance):
- `idx_accounts_sdk_analytics` - GIN index on sdk_analytics
- `idx_accounts_images_fetched` - Index on images_fetched_at

### Troubleshooting

**Error: "column already exists"**
- This is OK! It means the migration was already run
- Continue to next step

**Error: "permission denied"**
- Make sure you're logged in with admin/owner permissions
- Contact your Supabase project admin

---

## Step 2: Add Environment Variables to Vercel (3 minutes)

### Required Variables

You need to add 4 new environment variables for the Uqudo Info API integration:

```env
UQUDO_CLIENT_ID=456edf22-e887-4a32-b2e5-334bf902831f
UQUDO_CLIENT_SECRET=9OPYykfpSPWVr0uCTgeaER9hTLsStlhWd2SI3JA7ycWAcOvUawUtKZJW7fGE9dbx
UQUDO_AUTH_URL=https://id.uqudo.io/api/oauth2/token
UQUDO_INFO_API_URL=https://id.uqudo.io/api/v2/info
```

### Instructions

1. **Open Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Select your project: **uqudo-admin-portal**

2. **Navigate to Environment Variables**
   - Click **Settings** in the top menu
   - Click **Environment Variables** in the left sidebar

3. **Add Each Variable**

   For each of the 4 variables above:

   a. Click **Add New** button

   b. **Name**: `UQUDO_CLIENT_ID`
      **Value**: `456edf22-e887-4a32-b2e5-334bf902831f`
      **Environment**: Check all three:
      - ✅ Production
      - ✅ Preview
      - ✅ Development
      Click **Save**

   c. **Name**: `UQUDO_CLIENT_SECRET`
      **Value**: `9OPYykfpSPWVr0uCTgeaER9hTLsStlhWd2SI3JA7ycWAcOvUawUtKZJW7fGE9dbx`
      **Environment**: Check all three
      Click **Save**

   d. **Name**: `UQUDO_AUTH_URL`
      **Value**: `https://id.uqudo.io/api/oauth2/token`
      **Environment**: Check all three
      Click **Save**

   e. **Name**: `UQUDO_INFO_API_URL`
      **Value**: `https://id.uqudo.io/api/v2/info`
      **Environment**: Check all three
      Click **Save**

4. **Verify All Variables Added**
   You should see 4 new variables in the list

### What These Do

- **UQUDO_CLIENT_ID**: OAuth2 client ID for API authentication
- **UQUDO_CLIENT_SECRET**: OAuth2 client secret for API authentication
- **UQUDO_AUTH_URL**: Endpoint to obtain access token
- **UQUDO_INFO_API_URL**: Endpoint to fetch face and document images

---

## Step 3: Push Code to GitHub (2 minutes)

### What Will Be Deployed

**7 commits** containing:
- Performance Journey visualization (real SDK analytics)
- SDK version display in accounts page
- Smart status determination
- Face image integration
- Case modal overflow fix
- Database migration scripts
- Complete documentation

### Instructions

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
git push origin main
```

### What Happens Next

- Vercel will automatically detect the push
- Deployment will start (~2-3 minutes)
- You can watch progress at: https://vercel.com/dashboard/deployments

---

## Step 4: Verify Deployment (5 minutes)

### After Deployment Completes

1. **Wait for Vercel Deployment**
   - Go to https://vercel.com/dashboard/deployments
   - Wait for "Building" → "Ready" status
   - Should take 2-3 minutes

2. **Complete a Test SDK Verification**
   - Open your mobile app
   - Complete a new SDK verification
   - Submit to create a new account

3. **Check Accounts Page**
   - Go to Admin Portal → Accounts
   - Find the newly created account
   - Verify:
     - ✅ Verification column shows "Mobile vX.X.X" (green phone icon)
     - ✅ Face image appears in avatar (not initials)
     - ✅ Status reflects AML/scores if applicable

4. **Check Account Details**
   - Click "View Details" on the new account
   - Verify:
     - ✅ Large face image appears at top of modal
     - ✅ Performance Journey shows real timeline with events
     - ✅ All verification details display correctly

5. **Check Vercel Logs**
   - Go to Vercel Dashboard → Deployments → Latest → Functions
   - Look for logs showing:
     ```
     🔐 Requesting Uqudo API access token...
     ✅ Access token obtained successfully
     📸 Fetching images for session: abc123
     ✅ Info API response received
     ✅ Images fetched and stored for account: uuid
     ```

---

## Step 5: Monitor and Test (10 minutes)

### Things to Test

1. **SDK Version Display**
   - [ ] Mobile SDK shows "Mobile vX.X.X" with green phone icon
   - [ ] Web SDK shows "Web vX.X.X" with blue globe icon (if applicable)
   - [ ] Manual accounts show "Manual" with gray edit icon

2. **Smart Status**
   - [ ] Account with AML match shows "Under Review" (yellow)
   - [ ] Account with low face match (<2) shows "Rejected" (red)
   - [ ] Account with low liveness (<0.5) shows "Rejected" (red)
   - [ ] Clean account shows "Active" or actual status

3. **Face Images**
   - [ ] Avatar shows face photo (not initials)
   - [ ] Face image loads in detail modal
   - [ ] Fallback to initials works if image unavailable

4. **Performance Journey**
   - [ ] Timeline shows correct flow
   - [ ] Event timings are real (not synthetic)
   - [ ] Duration calculations are accurate
   - [ ] Event details expand correctly

5. **Case Modal**
   - [ ] Opens without overflowing behind sidebar
   - [ ] Content is fully visible
   - [ ] Scrolls correctly

---

## Common Issues and Solutions

### Issue 1: Face Images Not Appearing

**Symptoms**: Avatars show initials instead of face photos

**Causes**:
- Environment variables not set in Vercel
- Migration not executed
- OAuth2 authentication failing

**Solutions**:
1. Check Vercel environment variables are set correctly
2. Check Supabase - run verification query from COMBINED_MIGRATION.sql
3. Check Vercel function logs for authentication errors
4. Verify `face_image_url` and `face_image_base64` columns exist

### Issue 2: SDK Version Shows "Manual" for SDK Accounts

**Symptoms**: SDK verification shows "Manual" instead of "Mobile vX.X.X"

**Causes**:
- Database migration not executed
- `sdk_source` column doesn't exist

**Solutions**:
1. Execute COMBINED_MIGRATION.sql in Supabase SQL Editor
2. Verify columns exist with query:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'accounts' AND column_name = 'sdk_source';
   ```

### Issue 3: Performance Journey Shows Synthetic Data

**Symptoms**: Console shows "Generating synthetic events" instead of "Using real SDK analytics"

**Causes**:
- `sdk_analytics` column not populated
- Migration not executed
- Old accounts created before migration

**Solutions**:
1. Execute database migration
2. Complete a NEW SDK verification (old accounts won't have the data)
3. Check Vercel logs to confirm `buildAnalyticsEvents()` is running

### Issue 4: OAuth2 Authentication Fails

**Symptoms**: Vercel logs show "Failed to get access token"

**Causes**:
- Environment variables not set
- Invalid client credentials
- Network/firewall issues

**Solutions**:
1. Verify all 4 environment variables are set in Vercel
2. Check client ID and secret are correct (no extra spaces)
3. Redeploy after adding environment variables
4. Check Uqudo API status

---

## Rollback Plan

If critical issues occur after deployment:

### Code Rollback

```bash
cd "/Users/uqudo/Desktop/Admin Portal/ui-master"
git revert HEAD~7..HEAD
git push origin main
```

### Database Rollback

Only if absolutely necessary (will lose SDK analytics and face images):

```sql
-- Remove added columns
ALTER TABLE accounts
DROP COLUMN IF EXISTS sdk_source,
DROP COLUMN IF EXISTS sdk_verifications,
DROP COLUMN IF EXISTS sdk_documents,
DROP COLUMN IF EXISTS sdk_analytics,
DROP COLUMN IF EXISTS face_image_url,
DROP COLUMN IF EXISTS face_image_base64,
DROP COLUMN IF EXISTS document_front_url,
DROP COLUMN IF EXISTS document_back_url,
DROP COLUMN IF EXISTS images_fetched_at;

-- Drop indexes
DROP INDEX IF EXISTS idx_accounts_sdk_analytics;
DROP INDEX IF EXISTS idx_accounts_images_fetched;
```

---

## Success Criteria

✅ **All deployments successful**
✅ **Database migrations executed**
✅ **Environment variables configured**
✅ **Face images displaying correctly**
✅ **SDK versions showing correctly**
✅ **Smart status working**
✅ **Performance Journey showing real data**
✅ **No console errors**
✅ **Vercel logs show image fetching**

---

## Quick Reference

### Important Files

- `COMBINED_MIGRATION.sql` - Run this in Supabase SQL Editor
- `VERCEL_ENV_VARIABLES.md` - Environment variable reference
- `RUN_MIGRATIONS_GUIDE.md` - Detailed migration instructions
- `DEPLOYMENT_READY.md` - Complete deployment documentation

### Important URLs

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Supabase SQL Editor**: https://supabase.com/dashboard → SQL Editor
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel Environment Variables**: Settings → Environment Variables
- **Vercel Deployments**: https://vercel.com/dashboard/deployments
- **Vercel Function Logs**: Deployments → Latest → Functions

### Support Contacts

- **Uqudo API Docs**: https://docs.uqudo.com/docs/kyc/uqudo-api/
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

## Timeline Summary

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | Execute database migrations | 5 min | ⏳ Pending |
| 2 | Add environment variables to Vercel | 3 min | ⏳ Pending |
| 3 | Push code to GitHub | 2 min | ⏳ Pending |
| 4 | Verify deployment | 5 min | ⏳ Pending |
| 5 | Monitor and test | 10 min | ⏳ Pending |
| **Total** | **Complete deployment** | **~25 min** | |

---

## Next Actions

1. **RIGHT NOW**: Execute `COMBINED_MIGRATION.sql` in Supabase SQL Editor
2. **THEN**: Add 4 environment variables to Vercel
3. **THEN**: Push code to GitHub: `git push origin main`
4. **FINALLY**: Test with new SDK verification from mobile

---

**Version**: 1.0
**Date**: 2026-01-17
**Last Updated**: After attempting automated migrations via MCP

🎯 **Ready to deploy!** Follow the steps above in order.
