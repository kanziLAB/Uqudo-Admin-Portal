# Uqudo Admin Portal API Summary

Complete overview of all available API endpoints.

## Base URL

```
http://localhost:3000/api
```

---

## 1. Authentication

### POST /api/auth/login
Login to get JWT token

**Request:**
```json
{
  "email": "admin@demo.uqudo.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {...}
  }
}
```

---

## 2. Alerts Management

### POST /api/alerts ✨ NEW
Create a new alert manually

**Request:**
```json
{
  "account_id": "uuid",
  "alert_type": "manual_review",
  "priority": "high",
  "resolution_notes": "Optional notes"
}
```

**Valid Priorities:** `low`, `medium`, `high`, `critical`

### GET /api/alerts
List all alerts with filtering

**Query Parameters:**
- `page`, `limit` - Pagination
- `alertType`, `status` - Filtering
- `startDate`, `endDate` - Date range
- `search` - Search by user info

### GET /api/alerts/:id
Get alert details

### PATCH /api/alerts/:id/status
Update alert status

**Request:**
```json
{
  "status": "in_progress"
}
```

**Valid Status:** `open`, `in_progress`, `resolved`, `closed`

### POST /api/alerts/:id/actions
Perform alert actions

**Request:**
```json
{
  "action": "APPROVE",
  "reason": "All documents verified",
  "notes": "Optional notes"
}
```

**Valid Actions:** `APPROVE`, `DECLINE`, `CLEAN`, `SUSPICIOUS`, `FALSE_POSITIVE`

### POST /api/alerts/:id/assign
Assign alert to user

### GET /api/alerts/queue/summary
Get alert queue summary for dashboard

---

## 3. SDK Verification ✨ NEW

### POST /api/sdk-verification/submit
Submit Uqudo SDK verification results

**Request:**
```json
{
  "account_id": "uuid",
  "session_id": "optional-session-id",
  "verification": {
    "idScreenDetection": {"enabled": true, "score": 15},
    "idPrintDetection": {"enabled": true, "score": 10},
    "idPhotoTamperingDetection": {"enabled": true, "score": 25},
    "dataConsistencyCheck": {
      "enabled": true,
      "fields": [
        {"name": "firstName", "match": "MATCH"},
        {"name": "lastName", "match": "MATCH"}
      ]
    },
    "biometric": {
      "type": "FACIAL_RECOGNITION",
      "matchLevel": 4
    },
    "readingAuthentication": {
      "passiveAuthentication": true,
      "chipAuthentication": true
    },
    "mrzChecksum": true
  },
  "document_data": {...},
  "biometric_data": {...}
}
```

**Automatic Actions:**
- Updates account KYC status
- Creates alerts for failures
- Triggers manual review if needed
- Logs verification attempt

**Thresholds:**
- Screen Detection: Reject if > 50
- Print Detection: Reject if > 50
- Photo Tampering: Reject if > 70, Warning if > 40
- Face Match: Minimum level 3/5
- MRZ Checksum: Must pass

### GET /api/sdk-verification/thresholds
Get current verification thresholds

### POST /api/sdk-verification/test-analysis
Test verification without saving (requires auth)

---

## 4. Accounts

### GET /api/accounts
List accounts with filtering

### GET /api/accounts/:id
Get account details

### POST /api/accounts
Create new account

### PUT /api/accounts/:id
Update account

### GET /api/accounts/:id/biometric-data
Get biometric data

### GET /api/accounts/:id/device-attestation
Get device attestation

### GET /api/accounts/:id/activity-log
Get activity log

### POST /api/accounts/:id/actions
Perform account action

---

## 5. Cases (AML)

### GET /api/cases
List AML cases

### GET /api/cases/:id
Get case details

### POST /api/cases
Create new case

### PUT /api/cases/:id
Update case

### POST /api/cases/:id/actions
Perform case action

---

## 6. Dashboard

### GET /api/dashboard/stats
Get dashboard statistics

### GET /api/dashboard/recent-activity
Get recent activity

---

## 7. Configuration

### GET /api/config/countries
List countries

### POST /api/config/countries
Add country

### DELETE /api/config/countries/:id
Delete country

### GET /api/config/kyc-setup
Get KYC configuration

### PUT /api/config/kyc-setup
Update KYC configuration

### GET /api/config/blocklist
Get blocklist

### POST /api/config/blocklist
Add to blocklist

---

## 8. Workflow

### GET /api/workflow/rules
Get workflow rules

### POST /api/workflow/rules
Create workflow rule

---

## Documentation Files

- **CREATE_ALERT_API.md** - Complete alert creation guide
- **SDK_VERIFICATION_API.md** - Complete SDK verification guide
- **SDK_VERIFICATION_QUICK_START.md** - Quick start for SDK integration
- **HOW_TO_SUBMIT_ALERTS.md** - Alert submission examples
- **SERVER_CONFIGURATION.md** - Server setup and configuration

---

## Quick Examples

### Login and Create Alert
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.uqudo.com","password":"Admin@123"}' \
  | jq -r '.data.token')

# 2. Create Alert
curl -X POST http://localhost:3000/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "account-uuid",
    "alert_type": "manual_review",
    "priority": "high"
  }'
```

### Submit SDK Verification
```bash
curl -X POST http://localhost:3000/api/sdk-verification/submit \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "account-uuid",
    "verification": {
      "idScreenDetection": {"enabled": true, "score": 15},
      "idPrintDetection": {"enabled": true, "score": 10},
      "biometric": {"type": "FACIAL_RECOGNITION", "matchLevel": 4}
    }
  }'
```

---

## Test Data

**Demo Account:** `admin@demo.uqudo.com` / `Admin@123`

**Test Account ID:** `56c1843f-b6a4-49f1-b7af-6612e0cefef7`

---

## Servers

**Backend:** Port 3000 - `npm run dev` in `backend/`

**Frontend:** Port 8080 - `npm run dev` in root

---

## Key Features

### Alert Creation API ✨ NEW
- Manual alert creation
- Automatic validation
- Priority levels
- Resolution notes tracking

### SDK Verification API ✨ NEW
- Automatic threshold validation
- Account status management
- Alert auto-creation
- Manual review triggering
- Compliance with Uqudo standards

### Complete KYC/AML System
- Account management
- Alert management
- Case management
- Configuration
- Audit logging
- Role-based access control

---

## Authentication

Most endpoints require JWT token in header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Exceptions (Public):**
- `/api/auth/login`
- `/api/sdk-verification/*` (for webhook integration)

---

## Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request / Validation Error
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Server Error

---

## Testing

All endpoints tested and working:
- ✅ Alert creation
- ✅ SDK verification (pass/fail scenarios)
- ✅ Automatic alert generation
- ✅ Account status updates
- ✅ Threshold validation

Test account created with ID: `56c1843f-b6a4-49f1-b7af-6612e0cefef7`
