# SDK Trace Events Integration

**Date**: 2026-01-17
**Status**: ✅ Ready to Deploy - Requires SDK Configuration

---

## Overview

This update enables the admin portal to use **real SDK trace events** from the Uqudo SDK instead of building synthetic events from verification data.

**Documentation**: https://docs.uqudo.com/docs/kyc/uqudo-sdk/integration/web/analytics

---

## What Changed

### Before

The backend was building synthetic analytics events from verification data:

```javascript
const analyticsEvents = buildAnalyticsEvents(source, verifications, documents, verificationStatus);
```

This created basic events like:
- START (document scanning started)
- NFC_READING (chip reading)
- FINISH (verification completed)

But it was missing:
- VIEW event
- FACE_MATCH event (due to field name mismatch)
- LIVENESS event
- All other SDK trace events
- Real timestamps and durations

### After

The backend now extracts and uses real trace events from the JWS payload:

```javascript
const { source, documents, verifications, backgroundCheck, trace } = data;

const analyticsEvents = trace && trace.length > 0
  ? trace  // Use real trace events
  : buildAnalyticsEvents(source, verifications, documents, verificationStatus);  // Fallback
```

---

## SDK Trace Events Structure

According to Uqudo documentation, the SDK can send trace events with this structure:

```json
{
  "trace": [
    {
      "name": "VIEW",
      "type": "ENROLLMENT",
      "status": "success",
      "timestamp": "2026-01-17T17:36:46.772Z",
      "duration": 0,
      "details": {
        "sdk_type": "KYC_MOBILE",
        "sdk_version": "3.6.1"
      }
    },
    {
      "name": "START",
      "type": "SCAN",
      "status": "success",
      "timestamp": "2026-01-17T17:36:54.572Z",
      "duration": 8000,
      "details": {
        "page": "SCAN",
        "documentType": "GENERIC_ID"
      }
    },
    {
      "name": "FACE_MATCH",
      "type": "VERIFICATION",
      "status": "success",
      "timestamp": "2026-01-17T17:37:02.123Z",
      "duration": 500,
      "details": {
        "matchLevel": 5,
        "score": 1.0
      }
    },
    {
      "name": "LIVENESS",
      "type": "VERIFICATION",
      "status": "success",
      "timestamp": "2026-01-17T17:37:03.456Z",
      "duration": 300,
      "details": {
        "live": true,
        "confidence": 0.98
      }
    }
  ]
}
```

---

## Code Changes

### File: `backend/routes/sdk-verification-jws.js`

#### 1. Extract trace from JWS payload (Line 334)

```javascript
// Before
const { source, documents, verifications, backgroundCheck } = data;

// After
const { source, documents, verifications, backgroundCheck, trace } = data;
```

#### 2. Log trace events presence (Lines 342-343)

```javascript
console.log('📥 Received SDK verification request:', {
  sdkType: source?.sdkType,
  sdkVersion: source?.sdkVersion,
  documentType: documents?.[0]?.documentType,
  hasBackgroundCheck: !!backgroundCheck,
  backgroundCheckMatch: backgroundCheck?.match,
  hasTraceEvents: !!trace,           // NEW
  traceEventsCount: trace?.length || 0  // NEW
});
```

#### 3. Use trace events for existing accounts (Lines 509-513)

```javascript
// Use real trace events if available, otherwise build synthetic events
const analyticsEvents = trace && trace.length > 0
  ? trace
  : buildAnalyticsEvents(source, verifications, documents, verificationStatus);

console.log(`📊 Storing ${analyticsEvents.length} analytics events (${trace && trace.length > 0 ? 'real trace events' : 'synthetic events'})`);
```

#### 4. Use trace events for new accounts (Lines 529-533)

```javascript
// Use real trace events if available, otherwise build synthetic events
const analyticsEvents = trace && trace.length > 0
  ? trace
  : buildAnalyticsEvents(source, verifications, documents, verificationStatus);

console.log(`📊 Creating account with ${analyticsEvents.length} analytics events (${trace && trace.length > 0 ? 'real trace events' : 'synthetic events'})`);
```

---

## SDK Configuration Required

**IMPORTANT**: For this to work, the mobile SDK must be configured to **send trace events** in the JWS token.

### Check Your SDK Integration

1. **Mobile SDK Configuration** (iOS/Android):
   ```swift
   // iOS Example
   let config = UqudoConfig()
   config.enableAnalytics = true  // ← Must be enabled
   config.includeTraceInJWS = true  // ← Must include trace in JWS
   ```

   ```kotlin
   // Android Example
   val config = UqudoConfig.Builder()
       .setEnableAnalytics(true)  // ← Must be enabled
       .setIncludeTraceInJWS(true)  // ← Must include trace in JWS
       .build()
   ```

2. **Web SDK Configuration** (JavaScript):
   ```javascript
   const config = {
     enableAnalytics: true,  // ← Must be enabled
     includeTraceInJWS: true  // ← Must include trace in JWS
   };
   ```

### Verify Trace Events Are Being Sent

After deployment, check Vercel function logs for NEW SDK verifications:

```
📥 Received SDK verification request: {
  sdkType: 'KYC_MOBILE',
  sdkVersion: '3.6.1',
  documentType: 'GENERIC_ID',
  hasBackgroundCheck: true,
  backgroundCheckMatch: true,
  hasTraceEvents: true,        ← Should be TRUE
  traceEventsCount: 15         ← Should be > 0
}

📊 Creating account with 15 analytics events (real trace events)  ← Real events!
```

If you see:
```
hasTraceEvents: false
traceEventsCount: 0
📊 Creating account with 3 analytics events (synthetic events)  ← Fallback
```

Then the SDK is NOT sending trace events. Check SDK configuration.

---

## Expected Results

### With Trace Events (SDK Configured Correctly)

**Vercel Logs**:
```
hasTraceEvents: true
traceEventsCount: 15
📊 Storing 15 analytics events (real trace events)
```

**Performance Journey**:
```
1. VIEW (0ms)
   - SDK interface opened
   - Event: VIEW | Category: ENROLLMENT

2. START (8s)
   - Document scanning started
   - Page: SCAN | Document: GENERIC_ID

3. NFC_READING (2s)
   - Chip reading
   - Passive Auth: Valid

4. FACE_MATCH (500ms)
   - Face matching verification
   - Match Level: 5/5 | Score: 100%

5. LIVENESS (300ms)
   - Liveness detection
   - Live: Yes | Confidence: 98%

6. FINISH (remaining time)
   - Verification completed
   - Status: Success
```

### Without Trace Events (SDK Not Configured / Old SDK)

**Vercel Logs**:
```
hasTraceEvents: false
traceEventsCount: 0
📊 Storing 3 analytics events (synthetic events)
```

**Performance Journey**:
```
1. START (5s)
   - Document scanning started

2. NFC_READING (2s)
   - Chip reading

3. FINISH (1.5s)
   - Verification completed
```

---

## Testing Steps

### Step 1: Configure SDK to Send Trace Events

Update your mobile app SDK configuration to enable analytics and include trace in JWS.

### Step 2: Deploy Backend Changes

Push commits to GitHub - Vercel will auto-deploy.

### Step 3: Complete New SDK Verification

1. Open mobile app with updated SDK configuration
2. Start new verification
3. Complete all steps
4. Submit verification

### Step 4: Check Vercel Logs

Go to: https://vercel.com/yelkanzi-4760s-projects/uqudo-admin-portal/logs

Look for:
```
📥 Received SDK verification request: {
  hasTraceEvents: true,  ← Should be TRUE
  traceEventsCount: 15   ← Should be > 0
}
```

### Step 5: Check Admin Portal

**Alerts Page → View Details → Performance Journey**:
- Should show complete timeline with all events
- VIEW, START, FACE_MATCH, LIVENESS, FINISH
- Real timestamps and durations

**Accounts Page → View Details → Performance Journey**:
- Same complete timeline
- All verification steps visible

### Step 6: Verify in Database

Run diagnostic script:
```bash
node backend/check-latest-account.js
```

Should show:
```
SDK Analytics Events: 15
Events:
  - VIEW (ENROLLMENT): success
  - START (SCAN): success
  - FACE_MATCH (VERIFICATION): success
  - LIVENESS (VERIFICATION): success
  - FINISH (SCAN): success
```

---

## Backward Compatibility

### Old SDK Versions (Without Trace)

✅ **Still works** - Falls back to `buildAnalyticsEvents()`
- Creates synthetic events from verification data
- Basic timeline (START, NFC_READING, FINISH)
- No breaking changes

### New SDK Versions (With Trace)

✅ **Enhanced** - Uses real trace events
- Complete timeline with all SDK events
- Real timestamps and durations
- Detailed event properties

---

## Troubleshooting

### Issue: Still Showing Synthetic Events

**Symptoms**:
- Logs show: `hasTraceEvents: false`
- Performance Journey missing VIEW, FACE_MATCH, LIVENESS

**Solution**:
1. Check SDK configuration in mobile app
2. Ensure `enableAnalytics = true`
3. Ensure `includeTraceInJWS = true`
4. Update SDK to latest version if old
5. Rebuild and redeploy mobile app

### Issue: Trace Events Empty Array

**Symptoms**:
- Logs show: `hasTraceEvents: true, traceEventsCount: 0`
- Empty array: `trace: []`

**Solution**:
- SDK is configured but not capturing events
- Check if analytics are being tracked during verification flow
- Verify SDK initialization is correct
- Check SDK documentation for your specific platform

### Issue: Performance Journey Still Looks Wrong

**Symptoms**:
- Even with trace events, timeline looks incorrect

**Solution**:
1. Check trace event structure matches expected format
2. Verify event names (VIEW, START, FACE_MATCH, etc.)
3. Check `performance-journey.js` parseSDKAnalytics() function
4. Ensure frontend is using latest code

---

## Summary

### What Was Done

1. ✅ **Extract trace field** from JWS payload
2. ✅ **Use real trace events** when available
3. ✅ **Fall back to synthetic events** for old SDK
4. ✅ **Add logging** to show which type is being used
5. ✅ **Backward compatible** with existing SDK versions

### What's Required

1. ⏳ **Configure SDK** to send trace events (enableAnalytics + includeTraceInJWS)
2. ⏳ **Update mobile app** with SDK configuration
3. ⏳ **Deploy backend** changes to Vercel
4. ⏳ **Test with new verification** to see real trace events

### Expected Outcome

- 📊 **Real SDK trace events** displayed in Performance Journey
- 📈 **Complete timeline** with all verification steps
- ⏱️ **Accurate timestamps** and durations from SDK
- 🔄 **Backward compatible** with old SDK versions

---

**Status**: ✅ **READY TO DEPLOY**

**Requirements**: SDK must be configured to send trace events

**Files Changed**:
- `backend/routes/sdk-verification-jws.js` - Extract and use trace events
- `backend/check-jws-structure.js` - Diagnostic script

**Version**: 1.0.0
**Last Updated**: 2026-01-17
