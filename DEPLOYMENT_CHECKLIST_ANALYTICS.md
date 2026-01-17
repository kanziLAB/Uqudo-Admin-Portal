# Deployment Checklist - Real SDK Analytics Integration

## Overview
This checklist covers deploying the real SDK analytics integration to production.

---

## Pre-Deployment Checklist

### 1. Code Review ✅
- [x] `buildAnalyticsEvents()` function extracts real SDK data
- [x] Account creation stores `sdk_analytics`, `sdk_source`, `sdk_verifications`, `sdk_documents`
- [x] Account updates also store latest SDK data
- [x] `parseSDKAnalytics()` prioritizes real data over synthetic
- [x] Case modal overflow fixed
- [x] Documentation created

### 2. Database Changes Required ⚠️
- [ ] Run `DATABASE_MIGRATION_SDK_ANALYTICS.sql` in Supabase
- [ ] Verify columns created successfully
- [ ] Verify indexes created

### 3. Mobile SDK Configuration ⚠️
- [ ] Verify analytics enabled in mobile apps
- [ ] Confirm SDK version supports analytics
- [ ] Test SDK sends complete payload

---

## Deployment Steps

### Step 1: Push to GitHub
```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
git push origin main
```

Expected: "✅ Pushed to GitHub successfully"

### Step 2: Wait for Vercel Deployment
- [ ] Vercel automatically deploys (2-3 minutes)
- [ ] Check deployment status at https://vercel.com/dashboard
- [ ] Verify build succeeds
- [ ] Note deployment URL

### Step 3: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to SQL Editor

2. **Run Migration SQL**
   ```sql
   -- Add SDK analytics columns
   ALTER TABLE accounts
   ADD COLUMN IF NOT EXISTS sdk_analytics JSONB,
   ADD COLUMN IF NOT EXISTS sdk_source JSONB,
   ADD COLUMN IF NOT EXISTS sdk_verifications JSONB,
   ADD COLUMN IF NOT EXISTS sdk_documents JSONB;

   -- Add comments
   COMMENT ON COLUMN accounts.sdk_analytics IS 'Real SDK analytics events array';
   COMMENT ON COLUMN accounts.sdk_source IS 'Raw SDK source data (session, device, timing)';
   COMMENT ON COLUMN accounts.sdk_verifications IS 'SDK verification results (face match, liveness)';
   COMMENT ON COLUMN accounts.sdk_documents IS 'SDK document data (NFC, scan, OCR)';

   -- Create GIN indexes for JSONB columns
   CREATE INDEX IF NOT EXISTS idx_accounts_sdk_analytics
   ON accounts USING GIN (sdk_analytics);

   CREATE INDEX IF NOT EXISTS idx_accounts_sdk_source
   ON accounts USING GIN (sdk_source);

   CREATE INDEX IF NOT EXISTS idx_accounts_sdk_verifications
   ON accounts USING GIN (sdk_verifications);

   CREATE INDEX IF NOT EXISTS idx_accounts_sdk_documents
   ON accounts USING GIN (sdk_documents);
   ```

3. **Verify Migration**
   ```sql
   -- Check columns exist
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'accounts'
   AND column_name LIKE 'sdk_%';

   -- Check indexes exist
   SELECT indexname
   FROM pg_indexes
   WHERE tablename = 'accounts'
   AND indexname LIKE 'idx_accounts_sdk_%';
   ```

   Expected output:
   ```
   column_name           | data_type
   ----------------------|----------
   sdk_analytics         | jsonb
   sdk_source            | jsonb
   sdk_verifications     | jsonb
   sdk_documents         | jsonb

   indexname
   -------------------------------
   idx_accounts_sdk_analytics
   idx_accounts_sdk_source
   idx_accounts_sdk_verifications
   idx_accounts_sdk_documents
   ```

---

## Post-Deployment Testing

### Test 1: New SDK Enrollment
**Objective**: Verify real analytics data is captured and stored

1. **Complete SDK enrollment from mobile app**
   - Open mobile app with Uqudo SDK
   - Complete document scan + selfie verification
   - Submit enrollment

2. **Check Vercel Function Logs**
   ```
   Go to: Vercel Dashboard → Functions → /api/sdk-verification/enrollment-jws
   Look for: "✅ Created new account: [uuid]"
   ```

3. **Verify in Database**
   ```sql
   SELECT
     id,
     first_name,
     last_name,
     sdk_analytics,
     sdk_source->>'deviceModel' as device,
     sdk_source->>'sdkVersion' as sdk_version,
     jsonb_array_length(sdk_analytics) as event_count
   FROM accounts
   WHERE sdk_analytics IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   Expected:
   - `sdk_analytics`: Array with 4-6 events
   - `device`: Real device model (e.g., "iPhone 14 Pro")
   - `sdk_version`: SDK version number
   - `event_count`: 4-6 (depending on verification steps)

4. **Check Admin Portal**
   - Navigate to Accounts page
   - Click "View Details" on the new account
   - Scroll to "Performance Journey" section
   - **Verify**:
     - Timeline displays with circular indicators
     - Events show real timestamps (not just created_at offsets)
     - Durations are realistic (not fixed 5s, 3.5s)
   - Open browser console (F12)
   - **Look for**: `✅ Using real SDK analytics data: X events`

5. **Expand Event Details**
   - Click on events in the Performance Journey list
   - **Verify displays**:
     - Device model and platform
     - SDK version
     - Real scores (face match, liveness)
     - Actual timestamps

### Test 2: Case Modal Fix
**Objective**: Verify case detail modal displays properly

1. Navigate to Cases page
2. Click "View" on any case
3. **Verify**:
   - Modal is centered on screen
   - Modal doesn't overflow behind sidebar
   - All match details visible
   - Scrolling works properly

### Test 3: Alerts with Performance Journey
**Objective**: Verify Performance Journey works in alerts view

1. Navigate to KYC Alerts page
2. Click "View" on any alert with associated account
3. Scroll to "Performance Journey" section
4. **Verify**:
   - Timeline displays correctly
   - Events load from account data
   - Console shows real data usage

---

## Rollback Plan

If issues are encountered:

### Rollback Code
```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
git revert HEAD
git push origin main
```

### Rollback Database (if needed)
```sql
-- Remove SDK analytics columns
ALTER TABLE accounts
DROP COLUMN IF EXISTS sdk_analytics,
DROP COLUMN IF EXISTS sdk_source,
DROP COLUMN IF EXISTS sdk_verifications,
DROP COLUMN IF EXISTS sdk_documents;

-- Drop indexes
DROP INDEX IF EXISTS idx_accounts_sdk_analytics;
DROP INDEX IF EXISTS idx_accounts_sdk_source;
DROP INDEX IF EXISTS idx_accounts_sdk_verifications;
DROP INDEX IF EXISTS idx_accounts_sdk_documents;
```

---

## Monitoring

### What to Monitor

1. **Vercel Function Logs**
   - Check for errors in `/api/sdk-verification/enrollment-jws`
   - Verify `buildAnalyticsEvents()` is called successfully
   - Monitor for any JWS token parsing errors

2. **Database Performance**
   - Monitor query performance on new JSONB columns
   - Check if indexes are being used
   ```sql
   EXPLAIN ANALYZE
   SELECT sdk_analytics
   FROM accounts
   WHERE sdk_analytics IS NOT NULL;
   ```

3. **Frontend Console**
   - Check for JavaScript errors in Performance Journey component
   - Verify "Using real SDK analytics data" messages appear
   - Monitor for any rendering issues

### Success Metrics

- ✅ New accounts have `sdk_analytics` populated
- ✅ Performance Journey displays 4-6 events (not just 3)
- ✅ Event details show real device info and scores
- ✅ Durations are variable (not fixed synthetic values)
- ✅ Case modal displays without overflow
- ✅ No increase in error rates

---

## Communication

### Notify Team

**Subject**: Real SDK Analytics Integration Deployed

**Message**:
```
The Performance Journey component now uses real SDK analytics data!

What's New:
- Timeline shows actual verification timing from SDK
- Event details include real device info and verification scores
- No more synthetic/mock data fallback

What Changed:
- Database: 4 new columns added (sdk_analytics, sdk_source, sdk_verifications, sdk_documents)
- Backend: Extracts real timing from SDK payload
- Frontend: Prioritizes real data over synthetic events
- Case modal: Fixed overflow issue

Testing:
- Complete a new SDK enrollment from mobile
- View the account in admin portal
- Check "Performance Journey" section shows real data

Questions or Issues:
- Check REAL_ANALYTICS_INTEGRATION.md for details
- Review Vercel logs if analytics not appearing
```

---

## Troubleshooting Guide

### Issue: Performance Journey still shows synthetic data

**Symptoms**:
- Only 3 events (VIEW, START, FINISH)
- Event IDs show "GENERIC_ID"
- No device info in details
- Fixed durations (5s, 3.5s)

**Diagnosis**:
```sql
-- Check if SDK analytics columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'accounts'
AND column_name LIKE 'sdk_%';

-- Check if data is being stored
SELECT
  COUNT(*) as total_accounts,
  COUNT(sdk_analytics) as with_analytics,
  COUNT(sdk_source) as with_source
FROM accounts;
```

**Solution**:
1. Verify database migration ran successfully
2. Complete a NEW SDK enrollment (old accounts won't have data)
3. Check Vercel logs for `buildAnalyticsEvents()` calls
4. Verify mobile SDK sends complete payload

### Issue: Case modal still overflows

**Symptoms**:
- Modal covers sidebar
- Can't see all content
- Scrolling doesn't work properly

**Diagnosis**:
- Check browser console for CSS errors
- Inspect modal element classes

**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh page (Ctrl+Shift+R)
3. Check `pages/cases.html` has updated modal classes

### Issue: Mobile SDK not sending analytics

**Symptoms**:
- Backend creates account but no `sdk_analytics`
- Vercel logs show empty source/verifications/documents

**Diagnosis**:
```javascript
// Check Vercel logs for payload structure
console.log('SDK Payload:', { source, verifications, documents });
```

**Solution**:
1. Update mobile SDK to latest version
2. Enable analytics in SDK configuration
3. Verify webhook URL is correct
4. Check SDK documentation for analytics setup

---

## Success Criteria

Deployment is successful when:

- ✅ Database migration completed without errors
- ✅ Vercel deployment successful
- ✅ New SDK enrollments create accounts with `sdk_analytics`
- ✅ Performance Journey displays real timing and scores
- ✅ Browser console shows "Using real SDK analytics data"
- ✅ Case modal displays properly without overflow
- ✅ No increase in error rates or support tickets

---

## Documentation Links

- **Integration Guide**: `REAL_ANALYTICS_INTEGRATION.md`
- **Performance Journey Guide**: `PERFORMANCE_JOURNEY_GUIDE.md`
- **Mobile SDK Setup**: `UQUDO_SDK_MOBILE_SETUP_GUIDE.md`
- **Database Migration**: `DATABASE_MIGRATION_SDK_ANALYTICS.sql`
- **Changes Summary**: `CHANGES_SUMMARY.md`

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Vercel Deployment URL**: _________________
**Database Migration Status**: _________________
**Testing Completed**: _________________

---

**Status**: Ready for Deployment ✅
**Risk Level**: Low (backwards compatible, non-breaking changes)
**Estimated Downtime**: None (zero-downtime deployment)
