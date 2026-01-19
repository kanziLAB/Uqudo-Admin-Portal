# Uqudo SDK Analytics Integration Guide

## Overview

This document explains how analytics are captured from Uqudo Web SDK and Mobile SDK, how they're stored in the database, and what data is available for analysis.

## 1. Analytics Flow

### From SDK to Database

```
┌─────────────────┐
│   Web/Mobile    │
│   SDK Session   │
│   (User Flow)   │
└────────┬────────┘
         │
         │ Enrollment Complete
         │
         ▼
┌─────────────────┐
│  JWS Token      │◄── Contains ALL data
│  (JWT Signed)   │    - source
│                 │    - documents
│                 │    - verifications
│                 │    - backgroundCheck
│                 │    - trace (analytics)
└────────┬────────┘
         │
         │ POST /api/sdk-verification/enrollment-jws
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  JWT Decode     │
│  Parse & Store  │
└────────┬────────┘
         │
         │ Store in accounts table
         │
         ▼
┌─────────────────────────────────────────┐
│         Database (Supabase)             │
│  ┌───────────────────────────────────┐  │
│  │  accounts table                   │  │
│  │  ├─ sdk_source (JSONB)            │  │
│  │  ├─ sdk_verifications (JSONB)     │  │
│  │  ├─ sdk_documents (JSONB)         │  │
│  │  └─ sdk_analytics (JSONB)         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │
         │ Retrieved by Admin Portal
         │
         ▼
┌─────────────────┐
│  Analytics Page │
│  - Charts       │
│  - Tables       │
│  - Radar Chart  │
└─────────────────┘
```

## 2. Enabling Analytics in SDKs

### Web SDK
```javascript
// Enable analytics in Web SDK configuration
const config = {
  // ... other config
  analytics: {
    enabled: true
  }
};

// Initialize SDK with analytics
const uqudoSDK = new UqudoSDK(config);
```

**Documentation**: https://docs.uqudo.com/docs/kyc/uqudo-sdk/integration/web/analytics

### Mobile SDK (Android)
```kotlin
// Enable analytics in Android SDK
UqudoSDKConfig.Builder()
    .setEnableAnalytics(true)
    // ... other config
    .build()
```

**Documentation**: https://docs.uqudo.com/docs/kyc/uqudo-sdk/integration/android/analytics

### Mobile SDK (iOS)
```swift
// Enable analytics in iOS SDK
let config = UqudoSDKConfig()
config.enableAnalytics = true
// ... other config
```

## 3. Database Storage

### Table: `accounts`

Analytics and verification data are stored in 4 JSONB columns:

| Column | Type | Description | Example Data |
|--------|------|-------------|--------------|
| `sdk_source` | JSONB | SDK metadata | `{ "sdkType": "WEB", "sdkVersion": "2.1.0", "devicePlatform": "Chrome", "jti": "..." }` |
| `sdk_verifications` | JSONB | **Verification scores** | See below |
| `sdk_documents` | JSONB | Document data | `{ "documentType": "UAE_ID", "reading": {...}, "scan": {...} }` |
| `sdk_analytics` | JSONB | **Analytics events** | `{ "events": [{ "name": "VIEW", "duration": 1234, ... }] }` |

### `sdk_verifications` Structure (CRITICAL SCORES)

This field contains the **verification object** with fraud detection scores:

```json
{
  "documentType": "UAE_ID",
  "faceMatchLevel": 5,
  "livenessLevel": 4,
  "mrzValid": true,
  "documentValid": true,
  "dataConsistency": true,

  // FRAUD DETECTION SCORES (0-100)
  "idScreenDetection": {
    "enabled": true,
    "score": 12
  },
  "idPrintDetection": {
    "enabled": true,
    "score": 8
  },
  "idPhotoTamperingDetection": {
    "enabled": true,
    "score": 5
  },

  // DATA CONSISTENCY CHECK
  "dataConsistencyCheck": {
    "enabled": true,
    "fields": [
      {
        "fieldName": "fullName",
        "isConsistent": true
      },
      {
        "fieldName": "dateOfBirth",
        "isConsistent": true
      }
    ]
  }
}
```

**Reference**: https://docs.uqudo.com/docs/kyc/uqudo-sdk/sdk-result/data-structure/verification-object

### `sdk_analytics` Structure (TRACE EVENTS)

This field contains the **trace array** with all user journey events:

```json
{
  "events": [
    {
      "name": "VIEW",
      "type": "journey",
      "status": "SUCCESS",
      "duration": 1234,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "name": "START",
      "type": "journey",
      "status": "SUCCESS",
      "duration": 2345,
      "timestamp": "2024-01-15T10:30:01Z"
    },
    {
      "name": "NFC_READING",
      "type": "document",
      "status": "SUCCESS",
      "duration": 5678,
      "timestamp": "2024-01-15T10:30:03Z"
    },
    {
      "name": "FACE_MATCH",
      "type": "biometric",
      "status": "SUCCESS",
      "duration": 3456,
      "timestamp": "2024-01-15T10:30:09Z"
    },
    {
      "name": "LIVENESS",
      "type": "biometric",
      "status": "SUCCESS",
      "duration": 4567,
      "timestamp": "2024-01-15T10:30:12Z"
    },
    {
      "name": "FINISH",
      "type": "journey",
      "status": "SUCCESS",
      "duration": 789,
      "timestamp": "2024-01-15T10:30:17Z"
    }
  ]
}
```

## 4. How Data Reaches the Backend

### Step 1: SDK Enrollment Complete
When user completes enrollment, SDK generates a **JWS token** containing:
- `source` - SDK metadata
- `documents` - Scanned/NFC document data
- `verifications` - **Fraud detection scores**
- `backgroundCheck` - PEP/Sanctions results
- `trace` - **Analytics events array**

### Step 2: SDK Sends Token to Backend
The SDK automatically POSTs the JWS token to your configured webhook URL:

```
POST https://your-admin-portal.vercel.app/api/sdk-verification/enrollment-jws
Content-Type: application/json
X-Tenant-ID: your-tenant-id

{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 3: Backend Decodes and Stores
The backend (`/backend/routes/sdk-verification-jws.js`):

1. **Decodes JWS token** (line 310)
2. **Extracts data** (line 335):
   ```javascript
   const { source, documents, verifications, backgroundCheck, trace } = data;
   ```
3. **Processes analytics** (line 592):
   ```javascript
   const analyticsEvents = trace && trace.length > 0
     ? trace
     : buildAnalyticsEvents(source, verifications, documents, verificationStatus);
   ```
4. **Stores in database** (line 620-623):
   ```javascript
   sdk_analytics: analyticsEvents,
   sdk_source: source,
   sdk_verifications: verifications,
   sdk_documents: documents
   ```

## 5. Verification Scores Used in Analytics

### Current Implementation

The Admin Portal uses these scores for risk assessment and visualization:

#### From `sdk_verifications`:

1. **Face Match Level** (0-5 scale)
   - Stored: `verifications.faceMatchLevel`
   - Used in: Radar chart, risk scoring
   - Display: Converted to 0-100%

2. **Liveness Level** (0-5 scale)
   - Stored: `verifications.livenessLevel`
   - Used in: Radar chart, risk scoring
   - Display: Converted to 0-100%

3. **MRZ Valid** (boolean)
   - Stored: `verifications.mrzValid`
   - Used in: Radar chart, document validity
   - Display: Yes/No or 0/100%

4. **Document Valid** (boolean)
   - Stored: `verifications.documentValid`
   - Used in: Radar chart, verification status
   - Display: Yes/No or 0/100%

5. **Data Consistency** (boolean)
   - Stored: `verifications.dataConsistency`
   - Used in: Radar chart, fraud detection
   - Display: Yes/No or 0/100%

#### Fraud Detection Scores (0-100):

6. **Screen Detection Score**
   - Stored: `verifications.idScreenDetection.score`
   - Threshold: 50 (reject), 30 (warning)
   - Purpose: Detect if ID is displayed on screen vs physical

7. **Print Detection Score**
   - Stored: `verifications.idPrintDetection.score`
   - Threshold: 50 (reject)
   - Purpose: Detect if ID is printed copy vs original

8. **Photo Tampering Score**
   - Stored: `verifications.idPhotoTamperingDetection.score`
   - Threshold: 70 (reject)
   - Purpose: Detect if ID photo has been altered

### Missing Implementation (TO BE ADDED)

Currently, the radar chart **DOES NOT include** the fraud detection scores. These need to be added:

**Current Radar Chart** (6 points):
- Face Match
- Liveness
- MRZ Valid
- Document Valid
- Data Consistency
- Overall Quality

**Recommended Radar Chart** (9 points):
- Face Match
- Liveness
- MRZ Valid
- Document Valid
- Data Consistency
- Screen Detection (inverted: 100 - score)
- Print Detection (inverted: 100 - score)
- Photo Tampering (inverted: 100 - score)
- Overall Quality

## 6. Analytics Dashboard Features

### Current Features

1. **Sessions List**
   - Real-time monitoring (30-second refresh)
   - Displays all accounts with SDK data
   - Shows: Account, Document Type, Status, Risk, Duration, Platform, Created

2. **Summary Cards**
   - Total Sessions
   - Success Rate (APPROVED / total)
   - Avg Duration (calculated from `sdk_analytics.events[].duration`)
   - Active Now (sessions in last 5 minutes)

3. **Charts**
   - **Bar Chart**: Verification status distribution (Approved/Rejected/Pending)
   - **Line Chart**: Session trends over time
   - **Radar Chart**: Verification scores (6 points currently)

4. **Search**
   - By Account ID
   - By JTI (from `sdk_source.jti`)
   - By Session ID

5. **Detail Modal**
   - Radar chart of verification scores
   - Session information table
   - Verification details
   - Risk assessment tooltip

6. **Risk Scoring**
   - LOW: Approved with no flags
   - MEDIUM: Pending verification
   - HIGH: Rejected OR multiple failures detected

### Duration Calculation

Duration is calculated by **summing all event durations** from `sdk_analytics.events`:

```javascript
function calculateSessionDuration(events) {
  let totalDuration = 0;
  events.forEach(event => {
    totalDuration += event.duration || 0; // milliseconds
  });
  return Math.round(totalDuration / 1000); // convert to seconds
}
```

This matches the dashboard logic and provides accurate session duration.

## 7. Session ID and JTI

### Session Identifier

- **Account ID**: Primary key in `accounts` table (UUID)
- **JTI**: JWT ID from `sdk_source.jti` (unique per SDK session)
- **Session ID**: Can refer to either Account ID or JTI

### Search Implementation

The analytics page supports searching by both:
1. First tries direct lookup by Account ID
2. If not found, searches all accounts for matching `sdk_source.jti`
3. Filters results to show only that session

## 8. Recommended Enhancements

### 1. Add Fraud Detection Scores to Radar Chart
Update the radar chart to include:
- Screen Detection (inverted)
- Print Detection (inverted)
- Photo Tampering (inverted)

### 2. Add Session ID Column
Display `sdk_source.jti` prominently in the table for easy reference

### 3. Add Fraud Score Breakdown
Show individual fraud detection scores in the detail view

### 4. Add Data Consistency Fields
Display which fields passed/failed consistency check

### 5. Add Analytics Export
Allow exporting analytics data to CSV for reporting

## 9. Troubleshooting

### Analytics Not Showing

**Problem**: No analytics events in dashboard
**Check**:
1. Is `analytics.enabled = true` in SDK config?
2. Is the JWS token being sent to correct webhook URL?
3. Check `sdk_analytics` column in database - is it populated?
4. Check backend logs for JWS processing errors

### Duration Shows 0:00

**Problem**: All sessions show 0:00 duration
**Check**:
1. Does `sdk_analytics.events` contain `duration` fields?
2. Are event durations in milliseconds?
3. Check if `trace` array was sent by SDK

### Verification Scores Missing

**Problem**: Radar chart shows all zeros
**Check**:
1. Does `sdk_verifications` contain the verification object?
2. Check if verification fields exist: `faceMatchLevel`, `livenessLevel`, etc.
3. Verify JWS token includes `verifications` array

## 10. API Reference

### Webhook Endpoint

```
POST /api/sdk-verification/enrollment-jws
Headers:
  Content-Type: application/json
  X-Tenant-ID: <your-tenant-id>
Body:
  {
    "token": "<JWS token from SDK>"
  }
```

### Frontend API

```javascript
// Get all accounts (with SDK data)
api.getAccounts({ page: 1, limit: 20, sort: 'created_at', order: 'desc' })

// Get specific account by ID
api.getAccountById(accountId)

// Search by JTI (implemented in frontend)
searchSession(jtiValue)
```

## 11. Database Schema

```sql
-- Accounts table (relevant columns)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id TEXT NOT NULL,

  -- Personal data
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,

  -- Verification status
  verification_status TEXT,

  -- SDK Data (JSONB columns)
  sdk_source JSONB,           -- SDK metadata, jti, devicePlatform
  sdk_verifications JSONB,    -- Verification scores (FRAUD DETECTION)
  sdk_documents JSONB,        -- Document data
  sdk_analytics JSONB,        -- Analytics events (TRACE)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_accounts_sdk_source ON accounts USING GIN (sdk_source);
CREATE INDEX idx_accounts_sdk_analytics ON accounts USING GIN (sdk_analytics);
```

## 12. Summary

✅ **Analytics are enabled** in SDK by setting `analytics.enabled = true`
✅ **Analytics are received** via JWS token in `trace` array
✅ **Analytics are stored** in `sdk_analytics` column (JSONB)
✅ **Verification scores are stored** in `sdk_verifications` column (JSONB)
✅ **Duration is calculated** by summing event durations from trace
✅ **Session ID** can be Account ID or JTI from `sdk_source.jti`

🔲 **TODO**: Add fraud detection scores to radar chart
🔲 **TODO**: Display JTI prominently in UI
🔲 **TODO**: Add fraud score breakdown in detail view
