# Uqudo SDK Verification API

Complete API for receiving and processing Uqudo SDK verification results with automatic threshold-based validation.

## Overview

This API endpoint receives Uqudo SDK verification results, analyzes them against recommended thresholds, and automatically:
- Updates account KYC status
- Creates alerts for failed checks
- Triggers manual review when needed
- Stores verification session data

## Verification Thresholds

Based on [Uqudo SDK Documentation](https://docs.uqudo.com/docs/kyc/uqudo-sdk/sdk-result/data-structure/verification-object):

### ID Screen Detection
- **Reject Threshold:** Score > 50
- **Warning Threshold:** Score > 30
- **Description:** Detects if document was scanned through a screen (e.g., taking photo of a screen)

### ID Print Detection
- **Reject Threshold:** Score > 50
- **Warning Threshold:** Score > 30
- **Description:** Detects if document is a printed copy rather than original

### ID Photo Tampering Detection
- **Reject Threshold:** Score > 70
- **Warning Threshold:** Score > 40
- **Description:** Detects if photo on document has been tampered with
- **Note:** Scores > 40 trigger mandatory manual review

### Face Match (Biometric)
- **Minimum Match Level:** 3 out of 5
- **Description:** Facial recognition match between selfie and document photo

### Data Consistency Check
- **Allowed:** `MATCH` or `MATCH_PARTIALLY`
- **Reject:** `NO_MATCH`
- **Description:** Validates data consistency across verification steps

### Reading Authentication
- **Passive Authentication:** Certificate validation
- **Chip Authentication:** Chip-based security
- **Active Authentication:** Challenge-response verification

### MRZ Checksum
- **Validation:** Must pass MRZ checksum validation
- **Description:** Validates Machine Readable Zone integrity

---

## API Endpoints

### 1. Submit SDK Verification Results

Submit Uqudo SDK verification results for processing.

```
POST /api/sdk-verification/submit
```

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN (optional - can be public for webhooks)
```

#### Request Body

```json
{
  "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
  "session_id": "sdk-session-12345",
  "verification": {
    "idScreenDetection": {
      "enabled": true,
      "score": 25
    },
    "idPrintDetection": {
      "enabled": true,
      "score": 15
    },
    "idPhotoTamperingDetection": {
      "enabled": true,
      "score": 35
    },
    "dataConsistencyCheck": {
      "enabled": true,
      "fields": [
        {
          "name": "firstName",
          "match": "MATCH"
        },
        {
          "name": "dateOfBirth",
          "match": "MATCH"
        },
        {
          "name": "documentNumber",
          "match": "MATCH_PARTIALLY"
        }
      ]
    },
    "biometric": {
      "type": "FACIAL_RECOGNITION",
      "matchLevel": 4
    },
    "readingAuthentication": {
      "passiveAuthentication": true,
      "chipAuthentication": true,
      "activeAuthentication": false
    },
    "mrzChecksum": true
  },
  "document_data": {
    "documentType": "passport",
    "documentNumber": "AB1234567",
    "fullName": "John Doe",
    "dateOfBirth": "1990-01-15",
    "expiryDate": "2030-01-15"
  },
  "biometric_data": {
    "faceMatchScore": 0.92,
    "livenessScore": 0.95
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `account_id` | UUID | Account ID to link verification to |
| `verification` | Object | Verification object from Uqudo SDK |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | String | SDK session identifier |
| `document_data` | Object | Extracted document data |
| `biometric_data` | Object | Biometric verification data |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
    "session_id": "sdk-session-12345",
    "verification_status": "approved",
    "account_status": "active",
    "kyc_status": "verified",
    "issues": [],
    "warnings": [
      {
        "type": "DATA_CONSISTENCY",
        "severity": "medium",
        "fields": ["documentNumber"],
        "message": "Partial data match in fields: documentNumber"
      }
    ],
    "alerts_created": 1,
    "requires_manual_review": true,
    "passed_all_checks": true
  },
  "message": "Verification passed"
}
```

#### Verification Status Values

- **`approved`** - All checks passed, no issues
- **`rejected`** - One or more critical checks failed
- **`manual_review`** - Passed but requires manual review due to warnings

#### Example: Failed Verification

```json
{
  "success": true,
  "data": {
    "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
    "session_id": "sdk-session-12346",
    "verification_status": "rejected",
    "account_status": "suspended",
    "kyc_status": "failed",
    "issues": [
      {
        "type": "ID_PHOTO_TAMPERING",
        "severity": "critical",
        "score": 85,
        "threshold": 70,
        "message": "Photo tampering detected: Score 85 exceeds threshold 70"
      },
      {
        "type": "FACE_MATCH",
        "severity": "high",
        "matchLevel": 2,
        "threshold": 3,
        "message": "Face match level 2 is below minimum threshold 3"
      }
    ],
    "warnings": [],
    "alerts_created": 2,
    "requires_manual_review": false,
    "passed_all_checks": false
  },
  "message": "Verification failed"
}
```

---

### 2. Get Verification Thresholds

Get current verification thresholds configuration.

```
GET /api/sdk-verification/thresholds
```

#### Response

```json
{
  "success": true,
  "data": {
    "idScreenDetection": {
      "rejectThreshold": 50,
      "warningThreshold": 30,
      "description": "Document scanned through a screen"
    },
    "idPrintDetection": {
      "rejectThreshold": 50,
      "warningThreshold": 30,
      "description": "Printed document copy detected"
    },
    "idPhotoTamperingDetection": {
      "rejectThreshold": 70,
      "warningThreshold": 40,
      "description": "Photo tampering detected"
    },
    "faceMatch": {
      "minimumMatchLevel": 3,
      "description": "Facial recognition match level"
    },
    "dataConsistency": {
      "allowPartialMatch": true,
      "description": "Data consistency across verification steps"
    }
  }
}
```

---

### 3. Test Verification Analysis

Test verification analysis without saving to database (requires authentication).

```
POST /api/sdk-verification/test-analysis
```

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Request Body

```json
{
  "verification": {
    "idScreenDetection": {
      "enabled": true,
      "score": 75
    },
    "idPrintDetection": {
      "enabled": true,
      "score": 60
    },
    "idPhotoTamperingDetection": {
      "enabled": true,
      "score": 45
    },
    "biometric": {
      "type": "FACIAL_RECOGNITION",
      "matchLevel": 2
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "status": "rejected",
    "issues": [
      {
        "type": "ID_SCREEN_DETECTION",
        "severity": "high",
        "score": 75,
        "threshold": 50,
        "message": "Document scanned through a screen: Score 75 exceeds threshold 50"
      },
      {
        "type": "ID_PRINT_DETECTION",
        "severity": "high",
        "score": 60,
        "threshold": 50,
        "message": "Printed document copy detected: Score 60 exceeds threshold 50"
      },
      {
        "type": "FACE_MATCH",
        "severity": "high",
        "matchLevel": 2,
        "threshold": 3,
        "message": "Face match level 2 is below minimum threshold 3"
      }
    ],
    "warnings": [
      {
        "type": "ID_PHOTO_TAMPERING",
        "severity": "high",
        "score": 45,
        "threshold": 40,
        "message": "Photo tampering detected: Score 45 requires manual review"
      }
    ],
    "passedChecks": false,
    "requiresManualReview": true
  },
  "thresholds": { ... }
}
```

---

## Complete Integration Examples

### Example 1: Successful Verification

```bash
curl -X POST http://localhost:3000/api/sdk-verification/submit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
    "session_id": "uqudo-session-001",
    "verification": {
      "idScreenDetection": {
        "enabled": true,
        "score": 10
      },
      "idPrintDetection": {
        "enabled": true,
        "score": 8
      },
      "idPhotoTamperingDetection": {
        "enabled": true,
        "score": 15
      },
      "dataConsistencyCheck": {
        "enabled": true,
        "fields": [
          { "name": "firstName", "match": "MATCH" },
          { "name": "lastName", "match": "MATCH" },
          { "name": "dateOfBirth", "match": "MATCH" }
        ]
      },
      "biometric": {
        "type": "FACIAL_RECOGNITION",
        "matchLevel": 5
      },
      "mrzChecksum": true
    },
    "document_data": {
      "documentType": "passport",
      "documentNumber": "AB1234567",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15"
    }
  }'
```

**Result:** Account status → `active`, KYC status → `verified`, No alerts created

---

### Example 2: Failed Verification (Screen Detection)

```bash
curl -X POST http://localhost:3000/api/sdk-verification/submit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
    "verification": {
      "idScreenDetection": {
        "enabled": true,
        "score": 85
      },
      "idPrintDetection": {
        "enabled": false
      },
      "idPhotoTamperingDetection": {
        "enabled": true,
        "score": 20
      },
      "biometric": {
        "type": "FACIAL_RECOGNITION",
        "matchLevel": 4
      }
    }
  }'
```

**Result:** Account status → `suspended`, KYC status → `failed`, Alert created for screen detection

---

### Example 3: Manual Review Required

```bash
curl -X POST http://localhost:3000/api/sdk-verification/submit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "56c1843f-b6a4-49f1-b7af-6612e0cefef7",
    "verification": {
      "idScreenDetection": {
        "enabled": true,
        "score": 25
      },
      "idPrintDetection": {
        "enabled": true,
        "score": 20
      },
      "idPhotoTamperingDetection": {
        "enabled": true,
        "score": 55
      },
      "dataConsistencyCheck": {
        "enabled": true,
        "fields": [
          { "name": "firstName", "match": "MATCH" },
          { "name": "documentNumber", "match": "MATCH_PARTIALLY" }
        ]
      },
      "biometric": {
        "type": "FACIAL_RECOGNITION",
        "matchLevel": 4
      }
    }
  }'
```

**Result:** Account status → `pending`, KYC status → `pending`, Alerts created for photo tampering warning and partial data match

---

## Automatic Actions

### When Verification Passes
- ✅ Account status → `active`
- ✅ KYC status → `verified`
- ✅ No alerts created
- ✅ Account can proceed normally

### When Verification Fails
- ❌ Account status → `suspended`
- ❌ KYC status → `failed`
- ❌ High-priority alerts created for each issue
- ❌ Account blocked from proceeding

### When Manual Review Required
- ⚠️ Account status → `pending`
- ⚠️ KYC status → `pending`
- ⚠️ Medium-priority alerts created for warnings
- ⚠️ Analyst must review and approve/decline

---

## Alert Types Created

The system automatically creates alerts for detected issues:

| Detection Type | Alert Type | Priority |
|----------------|------------|----------|
| Screen Detection (score > 50) | `id_screen_detection` | high |
| Print Detection (score > 50) | `id_print_detection` | high |
| Photo Tampering (score > 70) | `id_photo_tampering` | critical |
| Photo Tampering (score > 40) | `id_photo_tampering` | high (warning) |
| Face Match (level < 3) | `face_match` | high |
| Data Mismatch | `data_consistency` | high |
| Partial Data Match | `data_consistency` | medium (warning) |
| MRZ Checksum Failed | `mrz_checksum` | high |
| Passive Auth Failed | `passive_authentication` | medium |

---

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "errors": [
    {
      "msg": "Account ID is required",
      "param": "account_id",
      "location": "body"
    }
  ]
}
```

### 404 Not Found - Account Not Found

```json
{
  "success": false,
  "error": "Account not found"
}
```

---

## Integration Notes

### Webhook Integration

For webhook integration from Uqudo SDK:

1. Configure webhook URL: `https://your-domain.com/api/sdk-verification/submit`
2. No authentication required for webhook (endpoint is public)
3. Ensure your account_id matches accounts in your database
4. Results are automatically processed and accounts updated

### Manual Integration

For manual integration from your application:

1. Use JWT authentication: `Authorization: Bearer YOUR_TOKEN`
2. Submit verification results after SDK completion
3. Handle response to update UI accordingly
4. Check `requires_manual_review` flag for pending cases

### Testing

Use the test endpoint to validate verification data without saving:

```bash
curl -X POST http://localhost:3000/api/sdk-verification/test-analysis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verification": {...}}'
```

---

## Best Practices

1. **Always include session_id** for tracking and debugging
2. **Store document_data** for audit trail and compliance
3. **Monitor manual_review cases** regularly to avoid backlogs
4. **Adjust thresholds** based on your risk tolerance (modify THRESHOLDS in code)
5. **Log verification attempts** for fraud detection patterns
6. **Handle partial matches** - some fields may legitimately differ slightly
7. **Test with various scenarios** before production deployment

---

## Database Tables Used

- **accounts** - Updated with verification status
- **kyc_alerts** - Alerts created for issues/warnings
- **verification_sessions** - Stores full verification data (optional table)
- **analyst_logs** - Logs verification attempts

---

## Summary

The SDK Verification API provides:
- ✅ Automatic threshold-based validation
- ✅ Intelligent alert creation
- ✅ Account status management
- ✅ Manual review triggering
- ✅ Complete audit trail
- ✅ Webhook and manual integration support
- ✅ Test mode for validation

All thresholds are based on Uqudo's official documentation and can be customized in `backend/routes/sdk-verification.js`.
