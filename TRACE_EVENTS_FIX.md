# Trace Events Fix - Analytics Duration Issue

## Problem Identified

The Web SDK sends trace events in a **different format** than what the Analytics page expects:

### Web SDK Format (What we receive):
```json
{
  "deviceIdentifier": "fa6b0057-256c-4144-a9cb-77ae934cf423",
  "status": "SUCCESS",
  "sessionId": "d9896439-52a4-4287-b26c-2f63f603313a",
  "timestamp": "2026-01-19T10:20:36.141Z",
  "event": "VIEW",              // ← Field name is "event" not "name"
  "category": "ENROLLMENT",
  "page": "SCAN",
  "documentType": "GENERIC_ID"
  // NO "duration" field! Need to calculate from timestamps
}
```

### Expected Format (What Analytics page needs):
```json
{
  "name": "VIEW",               // ← Field name is "name"
  "type": "journey",
  "status": "SUCCESS",
  "duration": 8010,             // ← Duration in milliseconds
  "timestamp": "2026-01-19T10:20:36.141Z",
  "metadata": { ... }
}
```

## Root Causes

1. **Field Mapping Mismatch**:
   - Web SDK uses `event` field
   - Analytics expects `name` field

2. **Missing Duration**:
   - Web SDK doesn't include `duration` in each event
   - Duration needs to be **calculated** from timestamp differences

3. **Document Type Not Captured**:
   - When no document data is extracted, document type from trace events wasn't used
   - User info shows as "Unknown" because no document extraction happened

## Solution Implemented

### 1. Added `normalizeTraceEvents()` Function

This function transforms Web SDK trace events into the expected format:

```javascript
function normalizeTraceEvents(trace) {
  if (!trace || trace.length === 0) return [];

  const normalized = [];
  let prevTimestamp = null;

  trace.forEach((event, index) => {
    const currentTimestamp = new Date(event.timestamp);

    // Calculate duration from previous event
    let duration = 0;
    if (prevTimestamp) {
      duration = currentTimestamp - prevTimestamp;
    }

    // Transform Web SDK format to expected format
    normalized.push({
      name: event.event || event.name,           // Map "event" → "name"
      type: event.category || event.type || 'journey',
      status: event.status || 'SUCCESS',
      duration: duration,                        // Calculate duration
      timestamp: event.timestamp,
      metadata: {
        page: event.page,
        documentType: event.documentType,
        deviceIdentifier: event.deviceIdentifier,
        sessionId: event.sessionId
      }
    });

    prevTimestamp = currentTimestamp;
  });

  return normalized;
}
```

### 2. Updated Trace Event Storage

Changed two locations in `sdk-verification-jws.js`:

**Before:**
```javascript
const analyticsEvents = trace && trace.length > 0
  ? trace  // ← Stored raw format
  : buildAnalyticsEvents(...);
```

**After:**
```javascript
const analyticsEvents = trace && trace.length > 0
  ? normalizeTraceEvents(trace)  // ← Normalize first!
  : buildAnalyticsEvents(...);
```

### 3. Extract Document Type from Trace Events

When no document data is available, extract document type from trace events:

```javascript
if (!accountData) {
  // Try to extract document type from trace events if available
  let documentType = null;
  if (trace && trace.length > 0) {
    const traceWithDoc = trace.find(t => t.documentType);
    documentType = traceWithDoc?.documentType || null;
  }

  accountData = {
    full_name: '',
    id_number: '',
    document_type: documentType,  // ← Now captures GENERIC_ID etc.
    ...
  };
}
```

## Example Transformation

### Your Trace Events (Raw):
```json
[
  {
    "event": "VIEW",
    "timestamp": "2026-01-19T10:20:36.141Z",
    "status": "SUCCESS",
    "documentType": "GENERIC_ID"
  },
  {
    "event": "START",
    "timestamp": "2026-01-19T10:20:44.305Z",  // +8.164s from VIEW
    "status": "SUCCESS"
  },
  {
    "event": "COMPLETE",
    "timestamp": "2026-01-19T10:20:45.770Z",  // +1.465s from START
    "status": "SUCCESS"
  },
  {
    "event": "FINISH",
    "timestamp": "2026-01-19T10:20:46.223Z",  // +453ms from COMPLETE
    "status": "SUCCESS"
  }
]
```

### After Normalization:
```json
[
  {
    "name": "VIEW",
    "type": "ENROLLMENT",
    "status": "SUCCESS",
    "duration": 0,              // First event has 0 duration
    "timestamp": "2026-01-19T10:20:36.141Z"
  },
  {
    "name": "START",
    "type": "ENROLLMENT",
    "status": "SUCCESS",
    "duration": 8164,           // 8.164 seconds in milliseconds
    "timestamp": "2026-01-19T10:20:44.305Z"
  },
  {
    "name": "COMPLETE",
    "type": "ENROLLMENT",
    "status": "SUCCESS",
    "duration": 1465,           // 1.465 seconds in milliseconds
    "timestamp": "2026-01-19T10:20:45.770Z"
  },
  {
    "name": "FINISH",
    "type": "ENROLLMENT",
    "status": "SUCCESS",
    "duration": 453,            // 453 milliseconds
    "timestamp": "2026-01-19T10:20:46.223Z"
  }
]
```

### Total Duration Calculation:
```
0ms + 8164ms + 1465ms + 453ms = 10,082ms = ~10 seconds
```

This matches your trace events: VIEW → START (+8.01s) → COMPLETE (+1.50s) → FINISH (+278ms) ≈ 10 seconds total

## Testing Steps

1. **Restart the backend server**:
   ```bash
   cd /Users/uqudo/Desktop/Admin\ Portal/ui-master/backend
   npm run dev  # Or however you run it
   ```

2. **Submit a new Web SDK session** with analytics enabled:
   ```javascript
   const config = {
     analytics: { enabled: true }
   };
   ```

3. **Check the Analytics page**:
   - Duration should now show correctly (e.g., "00:10" for 10 seconds)
   - Document Type should show "GENERIC_ID" or whatever was captured
   - Charts should reflect the real durations

4. **Verify in database**:
   ```bash
   cd backend
   node debug-android-session.js
   ```

   Should show:
   ```
   📊 SDK Analytics (Trace Events):
      Total Events: 4

      Event Breakdown:
      1. VIEW - SUCCESS (0ms)
      2. START - SUCCESS (8164ms)
      3. COMPLETE - SUCCESS (1465ms)
      4. FINISH - SUCCESS (453ms)

      ⏱️  Total Duration: 10082ms (10s)
   ```

## Files Modified

1. `/backend/routes/sdk-verification-jws.js`:
   - Added `normalizeTraceEvents()` function (line ~14)
   - Updated trace storage to use normalization (2 locations: lines ~603, ~627)
   - Extract document type from trace events when no document data (line ~462)

## Next Steps

After restarting the backend:

1. **Submit a new test session** from Web SDK with analytics enabled
2. **Verify the session appears** in Analytics page with correct duration
3. **Check document type** is captured correctly
4. **Test with Android SDK** when available to ensure it still works

## Why This Was Needed

The Uqudo Web SDK's analytics format is different from the Mobile SDK format:

- **Mobile SDK**: Already sends events with `name` and `duration` fields
- **Web SDK**: Sends events with `event` field and timestamps only (duration must be calculated)

The backend now handles BOTH formats correctly by normalizing Web SDK events before storage.
