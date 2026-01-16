# Create Alert API - Quick Reference

## POST /api/alerts

Create a new alert manually.

### Endpoint
```
POST http://localhost:3000/api/alerts
```

### Authentication
Requires JWT token in Authorization header. User must have one of these roles:
- analyst
- team_lead
- manager
- mlro

### Request Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Request Body

```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "alert_type": "DOCUMENT_QUALITY",
  "severity": "medium",
  "description": "Passport image is blurry and difficult to read",
  "alert_details": {
    "document_type": "passport",
    "issue": "Poor image quality"
  }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `account_id` | string (UUID) | ID of the account to create alert for |
| `alert_type` | string | Type of alert (see valid values below) |
| `severity` | string | Alert severity: `low`, `medium`, `high`, `critical` |
| `description` | string | Description of the alert issue |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `alert_details` | object | Additional details about the alert (free-form JSON) |

### Valid Alert Types

- `MISSING_INFORMATION` - Required information not provided
- `DOCUMENT_QUALITY` - Document image quality issues
- `DOCUMENT_MISMATCH` - Information doesn't match documents
- `AGE_VERIFICATION` - Age verification failed
- `FRAUD_SUSPICION` - Suspected fraudulent activity
- `PEP_SANCTIONS_HIT` - PEP or sanctions screening hit
- `HIGH_RISK_COUNTRY` - User from high-risk jurisdiction
- `BIOMETRIC_FAILURE` - Biometric verification failed
- `WATCHLIST_HIT` - Match on internal watchlist
- `OTHER` - Other types of alerts

### Severity Levels

- `low` - Minor issue, low priority
- `medium` - Moderate concern, standard review
- `high` - Serious issue, urgent review required
- `critical` - Critical risk, immediate action needed

---

## Example Requests

### 1. Using cURL

```bash
curl -X POST "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "DOCUMENT_QUALITY",
    "severity": "medium",
    "description": "Passport image is blurry and difficult to read",
    "alert_details": {
      "document_type": "passport",
      "issue": "Poor image quality"
    }
  }'
```

### 2. Using Frontend JavaScript (api-client.js)

```javascript
// Create a document quality alert
const alert = await api.createAlert({
  account_id: '550e8400-e29b-41d4-a716-446655440000',
  alert_type: 'DOCUMENT_QUALITY',
  severity: 'medium',
  description: 'Passport image is blurry and difficult to read',
  alert_details: {
    document_type: 'passport',
    issue: 'Poor image quality'
  }
});

console.log('Alert created:', alert);
```

### 3. Fraud Suspicion Alert

```bash
curl -X POST "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "FRAUD_SUSPICION",
    "severity": "high",
    "description": "Multiple failed verification attempts from different locations",
    "alert_details": {
      "attempts": 5,
      "locations": ["US", "Nigeria", "Russia"],
      "time_span_hours": 2
    }
  }'
```

### 4. PEP/Sanctions Hit

```bash
curl -X POST "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "PEP_SANCTIONS_HIT",
    "severity": "critical",
    "description": "User matched against sanctions watchlist",
    "alert_details": {
      "match_type": "sanctions",
      "list_name": "OFAC SDN List",
      "confidence": 0.95
    }
  }'
```

### 5. Biometric Failure

```bash
curl -X POST "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "BIOMETRIC_FAILURE",
    "severity": "high",
    "description": "Face match failed - selfie does not match ID photo",
    "alert_details": {
      "match_score": 0.45,
      "threshold": 0.75,
      "verification_method": "facial_recognition"
    }
  }'
```

---

## Success Response

### Status Code: 201 Created

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "tenant_id": "tenant-uuid",
    "account_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "DOCUMENT_QUALITY",
    "severity": "medium",
    "description": "Passport image is blurry and difficult to read",
    "alert_details": {
      "document_type": "passport",
      "issue": "Poor image quality"
    },
    "status": "open",
    "created_at": "2026-01-15T19:30:00.000Z",
    "updated_at": "2026-01-15T19:30:00.000Z"
  },
  "message": "Alert created successfully"
}
```

---

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "errors": [
    {
      "msg": "Invalid alert type",
      "param": "alert_type",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized - Missing/Invalid Token

```json
{
  "success": false,
  "error": "No token provided"
}
```

### 403 Forbidden - Insufficient Permissions

```json
{
  "success": false,
  "error": "Access denied. Insufficient permissions"
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

## Getting Your JWT Token

### 1. Login Request

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

### 2. Login Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "email": "admin@example.com",
      "role": "manager"
    }
  }
}
```

### 3. Use Token

```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

## Complete Workflow Example

```bash
#!/bin/bash

# 1. Login and get token
echo "Logging in..."
TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

# 2. Get an account ID (or use a known one)
ACCOUNT_ID="550e8400-e29b-41d4-a716-446655440000"

# 3. Create an alert
echo "Creating alert..."
ALERT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"account_id\": \"$ACCOUNT_ID\",
    \"alert_type\": \"DOCUMENT_QUALITY\",
    \"severity\": \"medium\",
    \"description\": \"Document verification issue requiring review\",
    \"alert_details\": {
      \"document_type\": \"passport\",
      \"issue\": \"Image quality below threshold\"
    }
  }")

echo "Alert Response:"
echo $ALERT_RESPONSE | jq '.'

# 4. Get the alert ID
ALERT_ID=$(echo $ALERT_RESPONSE | jq -r '.data.id')
echo "Created Alert ID: $ALERT_ID"

# 5. Get alert details
echo "Fetching alert details..."
curl -s -X GET "http://localhost:3000/api/alerts/$ALERT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# 6. Update alert status to in_progress
echo "Updating alert status..."
curl -s -X PATCH "http://localhost:3000/api/alerts/$ALERT_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}' \
  | jq '.'

# 7. Resolve the alert
echo "Resolving alert..."
curl -s -X POST "http://localhost:3000/api/alerts/$ALERT_ID/actions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "reason": "Document re-submitted with acceptable quality",
    "notes": "Verified all details match user information"
  }' \
  | jq '.'

echo "Done!"
```

---

## Testing with Postman

### Setup Collection

1. **Create Environment Variables:**
   - `base_url`: `http://localhost:3000`
   - `jwt_token`: (will be set after login)

2. **Login Request:**
   - Method: `POST`
   - URL: `{{base_url}}/api/auth/login`
   - Body (raw JSON):
     ```json
     {
       "email": "admin@example.com",
       "password": "password123"
     }
     ```
   - Test Script (to save token):
     ```javascript
     pm.environment.set("jwt_token", pm.response.json().data.token);
     ```

3. **Create Alert Request:**
   - Method: `POST`
   - URL: `{{base_url}}/api/alerts`
   - Headers:
     - `Authorization`: `Bearer {{jwt_token}}`
     - `Content-Type`: `application/json`
   - Body (raw JSON):
     ```json
     {
       "account_id": "550e8400-e29b-41d4-a716-446655440000",
       "alert_type": "DOCUMENT_QUALITY",
       "severity": "medium",
       "description": "Test alert from Postman",
       "alert_details": {
         "test": true
       }
     }
     ```

---

## Notes

- The alert will be created with status `open` by default
- The system automatically logs the action in the `analyst_logs` table
- The `account_id` must exist in your database and belong to your tenant
- Only users with analyst, team_lead, manager, or mlro roles can create alerts
- The backend server must be restarted after adding the POST endpoint

## Restart Backend

After implementing the POST endpoint, restart your backend server:

```bash
cd backend
npm run dev
```

The endpoint will now be available at `http://localhost:3000/api/alerts`
