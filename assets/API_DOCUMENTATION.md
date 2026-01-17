# Uqudo Admin Portal - API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:3000/api` (development)
**Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Dashboard](#dashboard)
3. [Accounts Management](#accounts-management)
4. [KYC Alerts](#kyc-alerts)
5. [AML Cases](#aml-cases)
6. [Configuration](#configuration)
   - [KYC Setup](#kyc-setup)
   - [Blocklist Management](#blocklist-management)
   - [Rule Engine](#rule-engine)
   - [Country Management](#country-management)
7. [Workflow Orchestrator](#workflow-orchestrator)
8. [Error Responses](#error-responses)

---

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "analyst",
      "tenantId": "uuid"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
```

---

## Dashboard

### Get KPIs
```http
GET /api/dashboard/kpis
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRegistrations": 1250,
    "activeAccounts": 980,
    "suspendedAccounts": 45,
    "blockedAccounts": 15,
    "pendingAlerts": 23,
    "unresolvedCases": 8,
    "growthRate": 12.5
  }
}
```

### Get Verification Type Distribution
```http
GET /api/dashboard/verification-type-distribution
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "verification_type": "uae", "count": 850 },
    { "verification_type": "international", "count": 400 }
  ]
}
```

### Get Account Status Distribution
```http
GET /api/dashboard/account-status-distribution
Authorization: Bearer {token}
```

### Get Country Distribution
```http
GET /api/dashboard/country-distribution
Authorization: Bearer {token}
```

### Get New Registrations (Time Series)
```http
GET /api/dashboard/new-registrations?period=7d
Authorization: Bearer {token}
```

**Query Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`

### Get Growth Rate
```http
GET /api/dashboard/growth-rate?period=30d
Authorization: Bearer {token}
```

---

## Accounts Management

### List Accounts
```http
GET /api/accounts?page=1&limit=20&search=john&accountStatus=active&verificationType=uae
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by name, email, user ID
- `accountStatus`: `active`, `suspended`, `blocked`
- `verificationType`: `uae`, `international`
- `pepStatus`: `clear`, `positive`, `in_process`
- `country`: Filter by country
- `startDate`: Filter from date (ISO 8601)
- `endDate`: Filter to date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "USR123456",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+971501234567",
      "date_of_birth": "1990-01-15",
      "nationality": "US",
      "verification_type": "uae",
      "account_status": "active",
      "pep_sanctions_status": "clear",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  }
}
```

### Get Account Details
```http
GET /api/accounts/:id
Authorization: Bearer {token}
```

### Update Account
```http
PATCH /api/accounts/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "account_status": "suspended",
  "notes": "Suspicious activity detected"
}
```

**Allowed Fields:**
- `account_status`: `active`, `suspended`, `blocked`
- `pep_sanctions_status`: `clear`, `positive`, `in_process`
- `notes`: String

### Get Verification Tickets
```http
GET /api/accounts/:id/verification-tickets
Authorization: Bearer {token}
```

### Update Verification Ticket
```http
PATCH /api/accounts/:id/verification-tickets/:ticketId
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved",
  "notes": "All checks passed"
}
```

### Get Biometric Data
```http
GET /api/accounts/:id/biometric
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "face_match_score": 98.5,
    "liveness_check": true,
    "liveness_score": 99.2,
    "biometric_timestamp": "2024-01-15T10:30:00Z",
    "images": {
      "selfie_url": "https://...",
      "id_photo_url": "https://..."
    }
  }
}
```

### Get Device Attestation Data
```http
GET /api/accounts/:id/device-attestation
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "device_id": "device-123",
    "device_type": "mobile",
    "os": "iOS",
    "os_version": "17.2",
    "app_version": "2.1.0",
    "attestation_status": "verified",
    "attestation_timestamp": "2024-01-15T10:30:00Z",
    "risk_score": 15
  }
}
```

### Request Documents
```http
POST /api/accounts/:id/documents/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "document_type": "proof_of_address",
  "reason": "Additional verification required",
  "due_date": "2024-02-15T23:59:59Z"
}
```

### Get Documents
```http
GET /api/accounts/:id/documents
Authorization: Bearer {token}
```

### Mark Document Compliance
```http
PATCH /api/accounts/:id/documents/:docId/compliance
Authorization: Bearer {token}
Content-Type: application/json

{
  "compliance_status": "compliant",
  "reviewer_notes": "Document verified"
}
```

### Get Activity Logs
```http
GET /api/accounts/:id/analyst-logs?page=1&limit=50
Authorization: Bearer {token}
```

### Add Note
```http
POST /api/accounts/:id/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Customer contacted regarding document update"
}
```

---

## KYC Alerts

### List Alerts
```http
GET /api/alerts?page=1&limit=20&status=pending&alertType=manual_review&severity=high
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: `pending`, `in_review`, `resolved`
- `alertType`: `manual_review`, `duplicate_account`, `id_expiry`
- `severity`: `low`, `medium`, `high`
- `assignedTo`: User ID
- `startDate`: Filter from date
- `endDate`: Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "alert_type": "manual_review",
      "severity": "high",
      "status": "pending",
      "description": "Manual review required for verification",
      "created_at": "2024-01-15T10:30:00Z",
      "assigned_to": null,
      "accounts": {
        "user_id": "USR123456",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 23,
    "totalPages": 2
  }
}
```

### Get Alert Details
```http
GET /api/alerts/:id
Authorization: Bearer {token}
```

### Update Alert Status
```http
PATCH /api/alerts/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "in_review"
}
```

### Perform Manual Actions on Alert
```http
POST /api/alerts/:id/actions
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "APPROVE",
  "reason": "All verification checks passed",
  "notes": "Customer information verified"
}
```

**Actions:**
- `APPROVE`: Approve and clear the alert
- `DECLINE`: Decline and block account
- `CLEAN`: Mark as clean (false positive)
- `SUSPICIOUS`: Flag for investigation
- `FALSE_POSITIVE`: Mark as false positive

**Required Roles:** `analyst`, `team_lead`, `manager`, `mlro`

**Response:**
```json
{
  "success": true,
  "data": {
    "alert_id": "uuid",
    "status": "resolved",
    "account_status": "active"
  },
  "message": "Alert action APPROVE completed successfully"
}
```

### Assign Alert
```http
POST /api/alerts/:id/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": "uuid"
}
```

### Get Queue Summary
```http
GET /api/alerts/queue/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 15,
    "in_review": 8,
    "my_queue": 3
  }
}
```

---

## AML Cases

### List AML Cases
```http
GET /api/cases?page=1&limit=20&resolutionStatus=unsolved&accountStatus=suspended
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `startDate`: Filter from date
- `endDate`: Filter to date
- `resolutionStatus`: `unsolved`, `false`, `positive`
- `accountStatus`: `active`, `suspended`, `blocked`
- `actionBy`: User ID who took action
- `search`: Search by case ID, user ID, name, email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "case_id": "AML-1705318200-USR12345",
      "account_id": "uuid",
      "case_type": "pep",
      "resolution_status": "unsolved",
      "risk_level": "high",
      "created_at": "2024-01-15T10:30:00Z",
      "accounts": {
        "user_id": "USR123456",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "account_status": "suspended"
      },
      "action_user": {
        "id": "uuid",
        "full_name": "Jane Smith"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

### Get Case Details
```http
GET /api/cases/:id
Authorization: Bearer {token}
```

### Perform Manual Actions on Case
```http
POST /api/cases/:id/actions
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "APPROVE",
  "notes": "False positive - no match confirmed"
}
```

**Actions:**
- `APPROVE`: Mark as false positive, clear PEP/sanctions, activate account
- `DECLINE`: Confirm match, block account
- `CLEAN`: Mark as clean (false positive)
- `SUSPICIOUS`: Flag for further review, suspend account
- `FALSE_POSITIVE`: Clear false match

**Required Roles:** `analyst`, `team_lead`, `manager`, `mlro`

**Action Effects:**

| Action | Resolution Status | PEP/Sanctions Status | Account Status |
|--------|------------------|---------------------|----------------|
| APPROVE | false | clear | active |
| DECLINE | positive | positive | blocked |
| CLEAN | false | clear | (unchanged) |
| SUSPICIOUS | positive | in_process | suspended |
| FALSE_POSITIVE | false | clear | (unchanged) |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "case_id": "AML-1705318200-USR12345",
    "resolution_status": "false",
    "action_by": "uuid"
  },
  "message": "Case action APPROVE completed successfully"
}
```

### Update Case Status
```http
PATCH /api/cases/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "resolutionStatus": "positive"
}
```

### Export Cases
```http
POST /api/cases/export
Authorization: Bearer {token}
```

---

## Configuration

### KYC Setup

#### Get KYC Setup
```http
GET /api/config/kyc-setup
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant_id": "uuid",
    "eid_verification_enabled": true,
    "ocr_enabled": true,
    "manual_review_required": true,
    "duplicate_check_enabled": true,
    "pep_screening_enabled": true,
    "sanctions_screening_enabled": true,
    "adverse_media_enabled": false,
    "document_expiry_grace_days": 30,
    "auto_approve_threshold": 95,
    "auto_reject_threshold": 30,
    "require_liveness_check": true,
    "require_device_attestation": false
  }
}
```

#### Update KYC Setup
```http
PUT /api/config/kyc-setup
Authorization: Bearer {token}
Content-Type: application/json

{
  "eid_verification_enabled": true,
  "document_expiry_grace_days": 60,
  "auto_approve_threshold": 90
}
```

**Required Roles:** `manager`, `mlro`

---

### Blocklist Management

#### List Blocklist Entries
```http
GET /api/config/blocklist?page=1&limit=20&type=pep&search=john
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `search`: Search by name, identifier, notes
- `type`: `pep`, `sanctions`, `adverse_media`, `custom`
- `source`: Filter by source

#### Get Blocklist Entry
```http
GET /api/config/blocklist/:id
Authorization: Bearer {token}
```

#### Add Blocklist Entry
```http
POST /api/config/blocklist
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "pep",
  "full_name": "John Doe",
  "identifier": "ID123456",
  "date_of_birth": "1970-01-15",
  "nationality": "US",
  "source": "OFAC",
  "notes": "Politically exposed person"
}
```

**Required Roles:** `team_lead`, `manager`, `mlro`

#### Update Blocklist Entry
```http
PUT /api/config/blocklist/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "Updated notes"
}
```

#### Delete Blocklist Entry
```http
DELETE /api/config/blocklist/:id
Authorization: Bearer {token}
```

**Required Roles:** `manager`, `mlro`

#### Bulk Import Blocklist
```http
POST /api/config/blocklist/import
Authorization: Bearer {token}
Content-Type: application/json

{
  "entries": [
    {
      "type": "sanctions",
      "full_name": "Jane Smith",
      "date_of_birth": "1980-05-20",
      "source": "UN Sanctions List"
    }
  ]
}
```

**Required Roles:** `manager`, `mlro`

---

### Rule Engine

#### List Rules
```http
GET /api/config/rules?type=duplicate_detection&status=active
Authorization: Bearer {token}
```

**Query Parameters:**
- `type`: `duplicate_detection`, `risk_scoring`, `auto_approval`, `alert_trigger`
- `status`: `active`, `inactive`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "rule_name": "Duplicate Email Check",
      "rule_type": "duplicate_detection",
      "description": "Check for duplicate emails",
      "conditions": {
        "field": "email",
        "operator": "equals"
      },
      "actions": {
        "create_alert": true,
        "alert_type": "duplicate_account",
        "severity": "high"
      },
      "priority": 90,
      "is_active": true,
      "created_by": "uuid",
      "created_user": {
        "id": "uuid",
        "full_name": "Admin User"
      }
    }
  ]
}
```

#### Get Rule
```http
GET /api/config/rules/:id
Authorization: Bearer {token}
```

#### Create Rule
```http
POST /api/config/rules
Authorization: Bearer {token}
Content-Type: application/json

{
  "rule_name": "High Risk Country Check",
  "rule_type": "risk_scoring",
  "description": "Flag accounts from high-risk countries",
  "conditions": {
    "field": "country",
    "operator": "in",
    "values": ["XX", "YY"]
  },
  "actions": {
    "create_alert": true,
    "alert_type": "manual_review",
    "severity": "high"
  },
  "priority": 80
}
```

**Required Roles:** `team_lead`, `manager`, `mlro`

#### Update Rule
```http
PUT /api/config/rules/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "priority": 95,
  "is_active": false
}
```

#### Delete Rule
```http
DELETE /api/config/rules/:id
Authorization: Bearer {token}
```

**Required Roles:** `manager`, `mlro`

#### Toggle Rule Status
```http
PATCH /api/config/rules/:id/toggle
Authorization: Bearer {token}
```

**Required Roles:** `team_lead`, `manager`, `mlro`

---

### Country Management

#### List Countries
```http
GET /api/config/countries?status=enabled
Authorization: Bearer {token}
```

**Query Parameters:**
- `status`: `enabled`, `disabled`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "country_code": "AE",
      "country_name": "United Arab Emirates",
      "is_enabled": true,
      "risk_level": "low",
      "requires_additional_verification": false
    }
  ]
}
```

#### Update Country Configuration
```http
PATCH /api/config/countries/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "is_enabled": true,
  "risk_level": "medium",
  "requires_additional_verification": true
}
```

**Required Roles:** `manager`, `mlro`

#### Bulk Update Countries
```http
POST /api/config/countries/bulk-update
Authorization: Bearer {token}
Content-Type: application/json

{
  "country_ids": ["uuid1", "uuid2"],
  "updates": {
    "is_enabled": false
  }
}
```

**Required Roles:** `manager`, `mlro`

---

## Workflow Orchestrator

### Get Workflow Status
```http
GET /api/workflow/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orchestrator_enabled": true,
    "duplicate_check_enabled": true,
    "pep_screening_enabled": true,
    "sanctions_screening_enabled": true,
    "statistics": {
      "pending_alerts": 15,
      "processing_alerts": 8,
      "active_rules": 12
    },
    "last_check": "2024-01-15T10:30:00Z"
  }
}
```

### Trigger Duplicate Check
```http
POST /api/workflow/trigger/duplicate-check
Authorization: Bearer {token}
Content-Type: application/json

{
  "account_id": "uuid"
}
```

**Required Roles:** `analyst`, `team_lead`, `manager`, `mlro`

**Response:**
```json
{
  "success": true,
  "data": {
    "alert_id": "uuid",
    "duplicates_found": 2,
    "duplicates": [
      {
        "id": "uuid",
        "user_id": "USR123456",
        "name": "John Doe",
        "email": "john@example.com"
      }
    ]
  },
  "message": "Duplicate check completed - 2 potential duplicate(s) found"
}
```

### Trigger PEP/Sanctions Screening
```http
POST /api/workflow/trigger/pep-screening
Authorization: Bearer {token}
Content-Type: application/json

{
  "account_id": "uuid"
}
```

**Required Roles:** `analyst`, `team_lead`, `manager`, `mlro`

**Response:**
```json
{
  "success": true,
  "data": {
    "case_id": "uuid",
    "matches_found": 1,
    "matches": [
      {
        "type": "pep",
        "full_name": "John Doe",
        "source": "OFAC"
      }
    ]
  },
  "message": "PEP/Sanctions screening completed - 1 match(es) found"
}
```

### Trigger ID Expiry Check
```http
POST /api/workflow/trigger/id-expiry-check
Authorization: Bearer {token}
```

**Required Roles:** `manager`, `mlro`

**Response:**
```json
{
  "success": true,
  "data": {
    "accounts_checked": 45,
    "alerts_created": 12
  },
  "message": "ID expiry check completed - 12 alert(s) created"
}
```

### Trigger Rule Evaluation
```http
POST /api/workflow/trigger/rule-evaluation
Authorization: Bearer {token}
Content-Type: application/json

{
  "account_id": "uuid",
  "rule_id": "uuid" // optional - evaluates all rules if not provided
}
```

**Required Roles:** `analyst`, `team_lead`, `manager`, `mlro`

**Response:**
```json
{
  "success": true,
  "data": {
    "rules_evaluated": 12,
    "rules_matched": 2,
    "results": [
      {
        "rule_id": "uuid",
        "rule_name": "High Risk Country Check",
        "matched": true,
        "actions": {
          "create_alert": true
        }
      }
    ]
  },
  "message": "Rule evaluation completed - 2 rule(s) matched"
}
```

### Batch Process
```http
POST /api/workflow/batch-process
Authorization: Bearer {token}
Content-Type: application/json

{
  "entity_type": "alerts",
  "entity_ids": ["uuid1", "uuid2", "uuid3"],
  "action": "resolved",
  "reason": "Batch approval after verification"
}
```

**Required Roles:** `manager`, `mlro`

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 3,
    "failed": 0,
    "errors": []
  },
  "message": "Batch processing completed - 3 successful, 0 failed"
}
```

### Get Workflow Audit Trail
```http
GET /api/workflow/audit-trail?page=1&limit=50&action_type=DUPLICATE_CHECK_TRIGGERED
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `action_type`: Filter by action type
- `startDate`: Filter from date
- `endDate`: Filter to date

**Required Roles:** `manager`, `mlro`

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or token invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate entry)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Error Messages

**Authentication Errors:**
- `No token provided`
- `Invalid or expired token`
- `Token expired`
- `Tenant account is not active`

**Authorization Errors:**
- `Insufficient permissions - role not allowed`
- `Missing required permission: {permission}`
- `View-only users cannot perform modifications`

**Validation Errors:**
- `{field} is required`
- `Invalid {field}`
- `{field} must be one of: {values}`

---

## Rate Limiting

- **Window:** 15 minutes (default)
- **Max Requests:** 100 per window (default)
- **Headers:**
  - `RateLimit-Limit`: Maximum requests allowed
  - `RateLimit-Remaining`: Requests remaining
  - `RateLimit-Reset`: Timestamp when limit resets

---

## Pagination

All list endpoints support pagination with consistent response format:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Role-Based Access Control (RBAC)

### Roles Hierarchy

1. **MLRO** (Money Laundering Reporting Officer) - Full access
2. **Manager** - High-level management access
3. **Team Lead** - Team management access
4. **Analyst** - Operational access
5. **View Only** - Read-only access

### Permission Matrix

| Action | View Only | Analyst | Team Lead | Manager | MLRO |
|--------|-----------|---------|-----------|---------|------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Accounts | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update Accounts | ✗ | ✓ | ✓ | ✓ | ✓ |
| View Alerts | ✓ | ✓ | ✓ | ✓ | ✓ |
| Perform Alert Actions | ✗ | ✓ | ✓ | ✓ | ✓ |
| View Cases | ✓ | ✓ | ✓ | ✓ | ✓ |
| Perform Case Actions | ✗ | ✓ | ✓ | ✓ | ✓ |
| View Config | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update KYC Setup | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage Blocklist | ✗ | ✗ | ✓ | ✓ | ✓ |
| Delete Blocklist | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage Rules | ✗ | ✗ | ✓ | ✓ | ✓ |
| Delete Rules | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage Countries | ✗ | ✗ | ✗ | ✓ | ✓ |
| Trigger Workflows | ✗ | ✓ | ✓ | ✓ | ✓ |
| Batch Process | ✗ | ✗ | ✗ | ✓ | ✓ |
| View Audit Trail | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## Webhooks (Future Enhancement)

Planned webhook events:
- `account.created`
- `account.updated`
- `alert.created`
- `alert.resolved`
- `case.created`
- `case.resolved`

---

## API Versioning

Currently using URL versioning:
- **v1:** `/api/v1/...` (not yet implemented)
- **Current:** `/api/...` (default, no version prefix)

Future versions will use explicit version prefixes.

---

## Support

For API support:
- **Email:** api-support@uqudo.com
- **Documentation:** https://docs.uqudo.com
- **Status Page:** https://status.uqudo.com

---

**Last Updated:** 2024-01-15
**API Version:** 1.0.0

---

## SDK Verification

### SDK Enrollment - JWS Token (Recommended)

Process complete Uqudo SDK enrollment results with JWS token validation.

```http
POST /api/sdk-verification/enrollment-jws
Content-Type: application/json

{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Optional Headers:**
- `X-Tenant-ID`: Your tenant UUID (defaults to demo tenant)

**Features:**
- ✅ JWS token decoding and validation
- ✅ Full NFC reading data support
- ✅ Document verification (scan + NFC)
- ✅ Biometric verification (face match)
- ✅ Fraud detection (screen, print, tampering)
- ✅ MRZ checksum validation
- ✅ Data consistency checks
- ✅ Background check processing (PEP, Sanctions)
- ✅ **Automatic account creation**
- ✅ **Automatic alert creation** (if background check matches)
- ✅ **Automatic AML case creation** (if background check matches)

**Response:**
```json
{
  "success": true,
  "data": {
    "verification": {
      "status": "approved",
      "issues": [],
      "warnings": [],
      "passed_checks": true,
      "nfc_verified": true,
      "passive_authentication": true
    },
    "backgroundCheck": {
      "match": true,
      "case_created": true,
      "alert_created": true,
      "case_data": {
        "case_id": "BGC-1768642496490",
        "database_case_id": "uuid",
        "case_type": "background_check_match",
        "priority": "critical",
        "matched_entities": [
          {
            "name": "Yahya Hadi",
            "match_score": 91,
            "risk_score": 90,
            "pep_types": [
              {
                "type": "AMB",
                "level": 3,
                "position": "Deputy Consul"
              }
            ],
            "events": [],
            "sources": [],
            "relationships": [],
            "addresses": [],
            "attributes": []
          }
        ],
        "match_count": 1,
        "highest_risk_score": 90,
        "recommended_action": "ESCALATE",
        "monitoring_id": null
      }
    },
    "account": {
      "account_id": "uuid",
      "account_created": true,
      "full_name": "Yahia Elhadi Hassan Elkanzi",
      "id_number": "784198520387683",
      "date_of_birth": "1985-06-08",
      "nationality": "SDN",
      "document_type": "UAE_ID",
      "card_number": "145217945",
      "gender": "M",
      "passport_number": "P13244869",
      "email": "user@example.com",
      "phone_number": "971504351311",
      "occupation": "09552661",
      "employer": "Uqudo Computer Systems Consultancies L.l.c",
      "nfc_verified": true,
      "passive_authentication": true
    },
    "source": {
      "sdk_type": "KYC_MOBILE",
      "sdk_version": "3.6.1",
      "device_model": "SM-A256E",
      "device_platform": "Android",
      "source_ip": "92.96.124.42"
    }
  },
  "message": "Verification approved. Background check match found - case BGC-1768642496490 created."
}
```

**Verification Thresholds:**

| Check | Threshold | Action |
|-------|-----------|--------|
| Screen Detection | > 50 | REJECT |
| Screen Detection | > 30 | WARNING |
| Print Detection | > 50 | REJECT |
| Photo Tampering | > 70 | REJECT |
| Face Match Level | < 3 | REJECT |
| MRZ Checksum | Invalid | REJECT |

**Case Priority Mapping:**

| Risk Score | Case Priority | Recommended Action |
|-----------|--------------|-------------------|
| 90-100 | Critical | ESCALATE |
| 70-89 | High | REVIEW |
| 0-69 | Medium | REVIEW |

**What It Does Automatically:**

When background check finds PEP/Sanctions matches:
1. ✅ Finds or creates account by ID number
2. ✅ Creates alert with priority (critical/high/medium)
3. ✅ Creates AML case with case ID (e.g., BGC-1768642496490)
4. ✅ Links alert to case via `alert_ids` JSON field
5. ✅ Logs all actions in analyst_logs table

**Testing:**
```bash
curl -X POST http://localhost:3000/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{"token": "YOUR_JWS_TOKEN_HERE"}'
```

---

### SDK Enrollment - Direct Data (Legacy)

Process enrollment data directly (backward compatible).

```http
POST /api/sdk-verification/enrollment
Content-Type: application/json

{
  "data": {
    "source": { ... },
    "documents": [ ... ],
    "verifications": [ ... ],
    "backgroundCheck": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verification": {
      "status": "approved",
      "issues": [],
      "warnings": [],
      "passedChecks": true
    },
    "backgroundCheck": {
      "match": true,
      "caseCreated": false,
      "caseData": {
        "case_type": "background_check_match",
        "priority": "critical",
        "matched_entities": [...],
        "recommended_action": "ESCALATE"
      }
    },
    "account": {...}
  },
  "message": "Verification approved. Background check match found."
}
```

**Note:** This endpoint returns case data but does not create database records automatically. Use the JWS endpoint for full automation.

---

## Additional Documentation

For complete integration guides and detailed documentation, see:

- **SDK JWS Integration**: `/UQUDO_SDK_JWS_INTEGRATION.md` - Complete guide for JWS endpoint
- **SDK Integration**: `/UQUDO_SDK_INTEGRATION.md` - Original endpoint documentation
- **Endpoints Summary**: `/SDK_ENDPOINTS_SUMMARY.md` - Quick comparison and reference
- **Deployment Guide**: `/DEPLOYMENT_GUIDE.md` - Vercel deployment instructions
- **Project Overview**: `/README_UQUDO.md` - Features, setup, and troubleshooting

All documentation files are available in the project root directory.

