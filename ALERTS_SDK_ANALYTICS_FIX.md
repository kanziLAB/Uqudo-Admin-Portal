# Alerts Performance Journey - Real SDK Analytics Fix

**Date**: 2026-01-17
**Status**: ✅ Fixed and Ready to Deploy

---

## Issue Reported

**User Question**: "in alert view>Performance Journey are these the actual analytics metrics captured from the SDK?"

**Answer**: No, they were synthetic/mock data. Now fixed to show real SDK analytics.

---

## Problem Analysis

### What Was Happening

When viewing an alert's Performance Journey, the timeline was showing **synthetic/mock events** instead of the **real SDK analytics** captured during verification.

### Root Cause

The alerts API endpoint (`GET /api/alerts`) was only fetching basic account fields:

```javascript
accounts (
  user_id,
  first_name,
  last_name,
  email,
  verification_channel,
  verification_type,
  account_status
)
```

It was **NOT** fetching the `sdk_analytics` field that contains the real SDK metrics.

### How the Fallback Worked

In `assets/js/performance-journey.js`, the `parseSDKAnalytics()` function has this priority:

1. **Priority 1**: Use `sdk_analytics` array (real SDK data) ✅ **This is what we want**
   ```javascript
   if (data.sdk_analytics && Array.isArray(data.sdk_analytics)) {
     console.log('✅ Using real SDK analytics data');
     return data.sdk_analytics;
   }
   ```

2. **Priority 2**: Use `analytics` property (legacy format)

3. **Priority 3**: Use `verification_steps` array

4. **Fallback**: Generate synthetic events from available data ❌ **This is what was happening**

Because the alerts API didn't return `sdk_analytics`, the function fell back to generating synthetic data.

---

## Solution

### Code Change

**File**: `backend/routes/alerts.js` (lines 29-48)

**Before**:
```javascript
let query = supabaseAdmin
  .from('kyc_alerts')
  .select(`
    *,
    accounts (
      user_id,
      first_name,
      last_name,
      email,
      verification_channel,
      verification_type,
      account_status
    )
  `, { count: 'exact' })
  .eq('tenant_id', tenantId);
```

**After**:
```javascript
let query = supabaseAdmin
  .from('kyc_alerts')
  .select(`
    *,
    accounts (
      user_id,
      first_name,
      last_name,
      email,
      verification_channel,
      verification_type,
      account_status,
      sdk_analytics,           // ✅ ADDED
      sdk_source,              // ✅ ADDED
      sdk_verifications,       // ✅ ADDED
      sdk_documents            // ✅ ADDED
    )
  `, { count: 'exact' })
  .eq('tenant_id', tenantId);
```

### What Each Field Contains

1. **`sdk_analytics`**: Array of real SDK events with:
   - Event name (VIEW, START, NFC_READING, FACE_MATCH, LIVENESS, etc.)
   - Event type (SCAN, VERIFICATION, COMPLETION)
   - Status (success, failure)
   - Timestamp (ISO 8601)
   - Duration (milliseconds)
   - Event details (scores, match levels, confidence, etc.)

2. **`sdk_source`**: SDK session metadata:
   - SDK type (mobile, web)
   - SDK version (e.g., "3.1.0")
   - Session ID
   - Session start time
   - Device model/platform

3. **`sdk_verifications`**: Verification results:
   - Face match (match level, score)
   - Liveness detection (live status, confidence)
   - Document checks (screen detection, print detection, tampering)
   - NFC reading results

4. **`sdk_documents`**: Document scan data:
   - Document type
   - Scan timestamps
   - NFC data (if available)
   - MRZ data

---

## Result

### Before Fix
- Alerts Performance Journey showed **synthetic/mock events**
- Events had estimated/fabricated timestamps
- No real SDK event details
- Console log: "Generating synthetic events from source data"

### After Fix
- Alerts Performance Journey shows **real SDK analytics**
- Events have actual timestamps from SDK
- Real event durations and details
- Console log: "✅ Using real SDK analytics data: X events"

---

## Testing

### How to Verify the Fix

1. **Complete a new SDK verification** from mobile app (after this deployment)

2. **Navigate to Alerts page** in admin portal

3. **Find the alert** created for the new verification

4. **Click "View Details"** on the alert

5. **Check Performance Journey tab**:
   - Should show real event timeline
   - Events should have actual timestamps
   - Event details should match SDK verification flow

6. **Open browser console** and look for:
   ```
   ✅ Using real SDK analytics data: X events
   ```
   (NOT "Generating synthetic events from source data")

### Expected Event Flow

For a typical mobile SDK verification, you should see:

1. **VIEW** - SDK interface opened
2. **START** - Document scanning started
3. **NFC_READING** - Chip reading (if applicable)
4. **FACE_MATCH** - Face matching verification
5. **LIVENESS** - Liveness detection
6. **DOCUMENT_CHECKS** - Screen/print/tampering detection
7. **COMPLETION** - Verification completed

Each event should have:
- Real timestamp from SDK
- Actual duration in milliseconds
- Detailed results (scores, confidence, match levels)

---

## Important Notes

### For New Accounts Only

- ✅ **New accounts** (created after SDK analytics feature deployment): Will have real analytics
- ⚠️ **Old accounts** (created before deployment): Will continue to show synthetic data (graceful fallback)

This is expected behavior because old accounts don't have `sdk_analytics` data stored in the database.

### No Breaking Changes

- ✅ Backward compatible (old accounts still work)
- ✅ Graceful fallback to synthetic data if no real data
- ✅ No database migrations required
- ✅ No frontend changes needed

### Performance Impact

- **Minimal**: Only fetching 4 additional JSONB fields
- **Efficient**: Data already in database (no extra API calls)
- **Cached**: Supabase handles query optimization

---

## Related Features

This fix complements the SDK analytics features already deployed:

1. ✅ **Accounts page**: Performance Journey shows real SDK analytics
2. ✅ **SDK version display**: Shows Mobile/Web SDK version
3. ✅ **Smart status**: Based on AML and verification scores
4. ✅ **Face images**: Automatic fetching and display
5. ✅ **Alerts page**: NOW shows real SDK analytics (this fix)

---

## Deployment

### Files Changed
- `backend/routes/alerts.js` - Added SDK fields to accounts query

### Deployment Steps
1. ✅ Code committed
2. Push to GitHub
3. Vercel auto-deploys
4. Test with new SDK verification

### Risk Level
**Low** - Just adding more data to existing API response

### Impact
**Positive** - Analysts will see actual SDK metrics instead of synthetic data

---

## Summary

### What Was Fixed
❌ Alerts Performance Journey was showing synthetic/mock data
✅ Now shows real SDK analytics captured from SDK verification

### How It Was Fixed
Added 4 SDK data fields (`sdk_analytics`, `sdk_source`, `sdk_verifications`, `sdk_documents`) to the alerts API accounts query.

### What to Expect
- **After deployment**: New SDK verifications will show real analytics in alerts view
- **Console logs**: Will show "✅ Using real SDK analytics data" instead of "Generating synthetic events"
- **Event details**: Will match actual SDK verification flow with real timestamps and durations

---

**Status**: ✅ **READY FOR DEPLOYMENT**

**Version**: 1.0.0
**Last Updated**: 2026-01-17
