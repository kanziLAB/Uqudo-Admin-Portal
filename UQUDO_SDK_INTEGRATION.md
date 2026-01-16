# Uqudo SDK Integration - Complete Enrollment Processing

## Endpoint

**POST** `http://localhost:3000/api/sdk-verification/enrollment`

## Purpose

Process the complete Uqudo SDK enrollment result including:
- ✅ Document verification
- ✅ Biometric verification (face match)
- ✅ Fraud detection (screen, print, tampering)
- ✅ Background checks (PEP, Sanctions, Adverse Media)
- ✅ **Automatic AML case creation** when background check finds matches

## Authentication

**Public endpoint** - No authentication required (for SDK webhook integration)

## Request Body

Send the complete JWT payload `data` object from Uqudo SDK:

```json
{
  "data": {
    "source": {
      "sdkType": "KYC_MOBILE",
      "sourceIp": "92.96.124.42",
      "sdkVersion": "3.6.1",
      "deviceModel": "SM-A256E"
    },
    "documents": [
      {
        "face": {
          "match": true,
          "matchLevel": 5
        },
        "scan": {
          "front": {
            "fullName": "Yahia Elhadi Hassan Elkanzi",
            "identityNumber": "784-1985-2038768-3",
            "dateOfBirth": "08/06/1985",
            "nationality": "Sudan"
          }
        },
        "documentType": "UAE_ID"
      }
    ],
    "verifications": [
      {
        "idScreenDetection": {
          "enabled": true,
          "score": 9.84
        },
        "idPrintDetection": {
          "enabled": true,
          "score": 0.01
        },
        "idPhotoTamperingDetection": {
          "enabled": true,
          "score": 0
        },
        "biometric": {
          "type": "FACIAL_RECOGNITION",
          "enabled": true,
          "matchLevel": 5
        }
      }
    ],
    "backgroundCheck": {
      "type": "RDC",
      "match": true,
      "content": {
        "nonReviewedAlertEntity": [
          {
            "entityName": "Yahya Hadi",
            "matchScore": 91,
            "riskScore": 90,
            "pepTypes": {
              "pepType": [
                {
                  "type": "AMB",
                  "level": 3,
                  "position": "Deputy Consul..."
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

## Response

### Success Response (with Background Check Match)

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
      "caseCreated": true,
      "caseData": {
        "case_type": "background_check_match",
        "priority": "critical",
        "matched_entities": [
          {
            "name": "Yahya Hadi",
            "matchScore": 91,
            "riskScore": 90,
            "pepTypes": [...],
            "events": [...],
            "sources": [...]
          }
        ],
        "match_count": 2,
        "highest_risk_score": 90,
        "recommended_action": "ESCALATE"
      }
    },
    "account": {
      "full_name": "Yahia Elhadi Hassan Elkanzi",
      "id_number": "784-1985-2038768-3",
      "date_of_birth": "1985-06-08",
      "nationality": "Sudan",
      "document_type": "UAE_ID"
    }
  },
  "message": "Verification approved. Background check match found - case created."
}
```

### Success Response (No Background Check Match)

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
      "match": false,
      "caseCreated": false,
      "caseData": null
    },
    "account": {
      "full_name": "John Doe",
      "id_number": "784-1990-1234567-8",
      "date_of_birth": "1990-01-01",
      "nationality": "UAE",
      "document_type": "UAE_ID"
    }
  },
  "message": "Verification approved. No background check matches."
}
```

### Failure Response (Verification Failed)

```json
{
  "success": true,
  "data": {
    "verification": {
      "status": "rejected",
      "issues": [
        {
          "type": "ID_SCREEN_DETECTION",
          "severity": "high",
          "score": 65,
          "message": "Screen detection score 65 exceeds threshold 50"
        },
        {
          "type": "FACE_MATCH",
          "severity": "critical",
          "matchLevel": 2,
          "message": "Face match level 2 below minimum 3"
        }
      ],
      "warnings": [],
      "passedChecks": false
    },
    "backgroundCheck": {
      "match": false,
      "caseCreated": false,
      "caseData": null
    },
    "account": {...}
  },
  "message": "Verification rejected. No background check matches."
}
```

## What It Does Automatically

### 1. Document Verification
- Extracts identity information (name, ID number, DOB, nationality)
- Returns structured account data

### 2. Fraud Detection
Validates against thresholds:
- **Screen Detection**: Rejects if score > 50
- **Print Detection**: Rejects if score > 50
- **Photo Tampering**: Rejects if score > 70
- **Face Match**: Requires minimum level 3/5

### 3. Background Check Processing
If `backgroundCheck.match === true`:
- ✅ Extracts all matched entities (PEP, Sanctions, Adverse Media)
- ✅ Calculates risk scores (0-100)
- ✅ Determines case priority:
  - **Critical**: Risk score ≥ 90
  - **High**: Risk score ≥ 70
  - **Medium**: Risk score < 70
- ✅ Returns comprehensive case data with:
  - Matched entities with names and scores
  - PEP types and positions
  - Event history
  - Source documentation
  - Recommended action (ESCALATE or REVIEW)

### 4. AML Case Creation (Future Enhancement)

Currently, the endpoint **returns case data** but doesn't create the case in the database yet. To enable automatic case creation, you need to:

1. Add `tenant_id` mapping (determine from your integration)
2. Add `account_id` (either existing or create new account)
3. Uncomment case creation logic

**To enable case creation**, add this code at line 545:

```javascript
// Create case in database
if (tenantId && accountData) {
  // Find or create account
  let accountId;
  const { data: existingAccount } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id_number', accountData.id_number)
    .single();

  if (existingAccount) {
    accountId = existingAccount.id;
  } else {
    // Create new account
    const { data: newAccount } = await supabaseAdmin
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        first_name: accountData.full_name.split(' ')[0],
        last_name: accountData.full_name.split(' ').slice(1).join(' '),
        id_number: accountData.id_number,
        date_of_birth: accountData.date_of_birth,
        nationality: accountData.nationality,
        kyc_verification_status: verificationStatus === 'approved' ? 'verified' : 'failed',
        account_status: verificationStatus === 'approved' ? 'active' : 'suspended'
      })
      .select()
      .single();

    accountId = newAccount.id;
  }

  // Create AML case
  const caseId = `BGC-${Date.now()}`;
  const { data: createdCase } = await supabaseAdmin
    .from('aml_cases')
    .insert({
      tenant_id: tenantId,
      account_id: accountId,
      case_id: caseId,
      resolution_status: 'unsolved',
      match_count: nonReviewedAlertEntity.length,
      external_case_url: null,
      alert_ids: []
    })
    .select()
    .single();

  // Create alert for background check match
  await supabaseAdmin
    .from('kyc_alerts')
    .insert({
      tenant_id: tenantId,
      account_id: accountId,
      alert_type: 'background_check_match',
      priority: casePriority,
      resolution_notes: `Background check found ${nonReviewedAlertEntity.length} matches. Highest risk score: ${maxRiskScore}`,
      status: 'open'
    });

  caseData.database_case_id = createdCase.id;
  caseData.database_account_id = accountId;
}
```

## Testing

### Test with cURL (No Background Match)

```bash
curl -X POST http://localhost:3000/api/sdk-verification/enrollment \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "documents": [{
        "scan": {
          "front": {
            "fullName": "John Doe",
            "identityNumber": "784-1990-1234567-8",
            "dateOfBirth": "1990-01-01",
            "nationality": "UAE"
          }
        },
        "documentType": "UAE_ID"
      }],
      "verifications": [{
        "idScreenDetection": {"enabled": true, "score": 10},
        "idPrintDetection": {"enabled": true, "score": 5},
        "idPhotoTamperingDetection": {"enabled": true, "score": 2},
        "biometric": {"type": "FACIAL_RECOGNITION", "enabled": true, "matchLevel": 5}
      }],
      "backgroundCheck": {
        "match": false
      }
    }
  }'
```

### Test with cURL (With Background Match)

Use the sample payload from your message (the complete JSON with PEP matches).

## Priority Mapping

| Risk Score | Case Priority | Recommended Action |
|-----------|--------------|-------------------|
| 90-100 | Critical | ESCALATE |
| 70-89 | High | REVIEW |
| 0-69 | Medium | REVIEW |

## Integration Steps

1. **Configure Uqudo SDK** to send enrollment results to this endpoint
2. **Add tenant identification** logic (API key, domain, etc.)
3. **Enable case creation** by adding the database code above
4. **Set up webhook** in Uqudo dashboard pointing to: `https://your-domain.com/api/sdk-verification/enrollment`

## Files

- **Implementation**: `/backend/routes/sdk-verification.js` (lines 413-582)
- **Server Registration**: `/backend/server.js:90` (already registered)

---

**Status**: ✅ Endpoint ready for testing
**Database Case Creation**: 🟡 Requires tenant_id mapping (see code above)
