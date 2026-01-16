# How to Submit Alerts to the API

## Current State

The alerts API at `http://localhost:3000/api/alerts` currently **does not support creating new alerts via POST**. Alerts are designed to be generated automatically by the system based on KYC verification results.

## Available Alert Endpoints

### 1. **GET /api/alerts** - List All Alerts
Retrieve all alerts with filtering and pagination.

```bash
curl -X GET "http://localhost:3000/api/alerts?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `alertType` - Filter by alert type
- `status` - Filter by status (open, in_progress, resolved, closed)
- `search` - Search by user info

### 2. **GET /api/alerts/:id** - Get Alert Details
Retrieve specific alert by ID.

```bash
curl -X GET "http://localhost:3000/api/alerts/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. **PATCH /api/alerts/:id/status** - Update Alert Status
Change alert status.

```bash
curl -X PATCH "http://localhost:3000/api/alerts/123/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'
```

**Valid Status Values:**
- `open`
- `in_progress`
- `resolved`
- `closed`

### 4. **POST /api/alerts/:id/actions** - Perform Alert Actions
Approve, decline, or mark alerts.

```bash
curl -X POST "http://localhost:3000/api/alerts/123/actions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "reason": "All documents verified",
    "notes": "User identity confirmed through additional checks"
  }'
```

**Valid Actions:**
- `APPROVE` - Approve KYC verification
- `DECLINE` - Decline KYC verification
- `CLEAN` - Mark as clean (no AML/sanctions match)
- `SUSPICIOUS` - Flag as suspicious
- `FALSE_POSITIVE` - Mark as false positive

### 5. **POST /api/alerts/:id/assign** - Assign Alert to User
Assign alert to a specific analyst.

```bash
curl -X POST "http://localhost:3000/api/alerts/123/assign" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedTo": "user-uuid-here"
  }'
```

### 6. **GET /api/alerts/queue/summary** - Get Alert Summary
Get dashboard summary of alerts.

```bash
curl -X GET "http://localhost:3000/api/alerts/queue/summary" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## How to Create New Alerts (POST Endpoint)

If you need to **manually create alerts**, you'll need to add a POST endpoint to the backend. Here's how:

### Step 1: Add POST Endpoint to Backend

Edit `/Users/uqudo/Desktop/Admin Portal/ui-master/backend/routes/alerts.js` and add this route:

```javascript
/**
 * @route   POST /api/alerts
 * @desc    Create a new alert manually
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('account_id').notEmpty().withMessage('Account ID is required'),
    body('alert_type').isIn([
      'MISSING_INFORMATION',
      'DOCUMENT_QUALITY',
      'DOCUMENT_MISMATCH',
      'AGE_VERIFICATION',
      'FRAUD_SUSPICION',
      'PEP_SANCTIONS_HIT',
      'HIGH_RISK_COUNTRY',
      'BIOMETRIC_FAILURE',
      'WATCHLIST_HIT',
      'OTHER'
    ]).withMessage('Invalid alert type'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
    body('description').notEmpty().withMessage('Description is required'),
    body('alert_details').optional().isObject()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tenantId, id: userId } = req.user;
    const { account_id, alert_type, severity, description, alert_details } = req.body;

    // Verify account exists
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Create alert
    const { data, error } = await supabaseAdmin
      .from('kyc_alerts')
      .insert({
        tenant_id: tenantId,
        account_id,
        alert_type,
        severity,
        description,
        alert_details: alert_details || {},
        status: 'open',
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        alert_id: data.id,
        account_id,
        action: 'ALERT_CREATED',
        description: `Manual alert created: ${alert_type}`,
        user_id: userId
      });

    res.status(201).json({
      success: true,
      data,
      message: 'Alert created successfully'
    });
  })
);
```

### Step 2: Add Method to Frontend API Client

Edit `/Users/uqudo/Desktop/Admin Portal/ui-master/assets/js/api-client.js` and add this method in the ALERTS section:

```javascript
async createAlert(data) {
  return this.post('/alerts', data);
}
```

### Step 3: Use cURL to Create an Alert

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

### Step 4: Use Frontend JavaScript

```javascript
// Create a new alert from the frontend
const newAlert = await api.createAlert({
  account_id: '550e8400-e29b-41d4-a716-446655440000',
  alert_type: 'FRAUD_SUSPICION',
  severity: 'high',
  description: 'Multiple failed verification attempts',
  alert_details: {
    attempts: 5,
    last_attempt: '2026-01-15T10:30:00Z'
  }
});

console.log('Alert created:', newAlert);
```

---

## Alert Types Reference

Valid `alert_type` values:
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

## Severity Levels

- `low` - Minor issue, low priority
- `medium` - Moderate concern, standard review
- `high` - Serious issue, urgent review required
- `critical` - Critical risk, immediate action needed

---

## Getting Your JWT Token

1. **Login via API:**
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

2. **Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

3. **Use the token:**
```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Testing with Postman

### Setup:
1. **Create a new request**
2. **Method:** POST
3. **URL:** `http://localhost:3000/api/alerts`
4. **Headers:**
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
   - `Content-Type`: `application/json`
5. **Body (raw JSON):**
```json
{
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "alert_type": "DOCUMENT_QUALITY",
  "severity": "medium",
  "description": "Document verification issue",
  "alert_details": {
    "document_type": "passport",
    "issue": "Expired document"
  }
}
```

---

## Complete Example: Create and Resolve Alert

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.data.token')

# 2. Create an alert
ALERT=$(curl -s -X POST "http://localhost:3000/api/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "DOCUMENT_QUALITY",
    "severity": "medium",
    "description": "Passport image quality issue"
  }')

ALERT_ID=$(echo $ALERT | jq -r '.data.id')

# 3. Update alert status to in_progress
curl -X PATCH "http://localhost:3000/api/alerts/$ALERT_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# 4. Resolve the alert
curl -X POST "http://localhost:3000/api/alerts/$ALERT_ID/actions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "reason": "Document re-submitted with better quality",
    "notes": "Verified passport details match user information"
  }'
```

---

## Summary

**Currently Available:**
- ✅ GET alerts (list and details)
- ✅ Update alert status
- ✅ Perform alert actions (approve/decline)
- ✅ Assign alerts to users
- ✅ Get alert summary

**Not Currently Available:**
- ❌ POST to create new alerts manually

**To Enable Alert Creation:**
1. Add the POST endpoint to `backend/routes/alerts.js` (code provided above)
2. Add `createAlert()` method to `assets/js/api-client.js`
3. Restart backend server
4. Use cURL, Postman, or frontend JavaScript to create alerts

The API is designed for alerts to be auto-generated by the KYC verification system, but you can add manual alert creation if needed for testing or special cases.
