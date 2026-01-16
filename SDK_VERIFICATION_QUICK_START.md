# Uqudo SDK Verification API - Quick Start

## Overview

The SDK Verification API automatically processes Uqudo SDK results and manages account verification status.

## Endpoint

```
POST http://localhost:3000/api/sdk-verification/submit
```

## Minimal Request

```bash
curl -X POST http://localhost:3000/api/sdk-verification/submit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "verification": {
      "idScreenDetection": {"enabled": true, "score": 15},
      "idPrintDetection": {"enabled": true, "score": 10},
      "idPhotoTamperingDetection": {"enabled": true, "score": 25},
      "biometric": {"type": "FACIAL_RECOGNITION", "matchLevel": 4},
      "mrzChecksum": true
    }
  }'
```

## What Happens Automatically

### ✅ Verification Passes (Low Scores)
- Account status → `active`
- KYC status → `verified`
- No alerts created
- Response: `"verification_status": "approved"`

### ❌ Verification Fails (High Scores)
- Account status → `suspended`
- KYC status → `failed`
- Alerts created for each issue
- Response: `"verification_status": "rejected"`

### ⚠️ Manual Review Required (Medium Scores)
- Account status → `pending`
- KYC status → `pending`
- Warning alerts created
- Response: `"verification_status": "manual_review"`

## Score Thresholds

| Check | Warning | Reject | Description |
|-------|---------|--------|-------------|
| Screen Detection | > 30 | > 50 | Document scanned through screen |
| Print Detection | > 30 | > 50 | Printed copy of document |
| Photo Tampering | > 40 | > 70 | Photo manipulation detected |
| Face Match | < 3 | < 3 | Selfie doesn't match document |

## Response Format

```json
{
  "success": true,
  "data": {
    "verification_status": "approved|rejected|manual_review",
    "account_status": "active|suspended|pending",
    "kyc_status": "verified|failed|pending",
    "issues": [...],
    "warnings": [...],
    "alerts_created": 0,
    "requires_manual_review": false
  }
}
```

## Test Examples

### Pass: All Low Scores
```bash
curl -X POST http://localhost:3000/api/sdk-verification/submit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
    "verification": {
      "idScreenDetection": {"enabled": true, "score": 10},
      "idPrintDetection": {"enabled": true, "score": 15},
      "idPhotoTamperingDetection": {"enabled": true, "score": 20},
      "biometric": {"type": "FACIAL_RECOGNITION", "matchLevel": 5}
    }
  }'
```

### Fail: High Tampering Score
```bash
curl -X POST http://localhost:3000/api/sdk-verification/submit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
    "verification": {
      "idPhotoTamperingDetection": {"enabled": true, "score": 85},
      "biometric": {"type": "FACIAL_RECOGNITION", "matchLevel": 2}
    }
  }'
```

## Get Current Thresholds

```bash
curl http://localhost:3000/api/sdk-verification/thresholds
```

## Key Features

- ✅ **Automatic Account Updates** - Status changes based on verification
- ✅ **Alert Creation** - Alerts for issues and warnings
- ✅ **Threshold-Based** - Following Uqudo recommendations
- ✅ **Audit Trail** - All verifications logged
- ✅ **No Auth Required** - Public endpoint for webhooks
- ✅ **Test Mode** - `/test-analysis` endpoint for testing

## See Full Documentation

For complete details, examples, and all verification checks:
- `SDK_VERIFICATION_API.md` - Complete API documentation
