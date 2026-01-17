# Uqudo SDK JWS Integration - Complete Guide

## Overview

This endpoint processes the **complete** Uqudo SDK enrollment result including:
- ✅ Document verification (OCR Scan + NFC Reading)
- ✅ Biometric verification (face match)
- ✅ Fraud detection (screen, print, tampering)
- ✅ MRZ checksum validation
- ✅ Data consistency checks
- ✅ Background checks (PEP, Sanctions, Adverse Media via RDC)
- ✅ **Automatic account, alert, and AML case creation**

## Endpoint

**POST** `http://localhost:3000/api/sdk-verification/enrollment-jws`

(Production: `https://your-app.vercel.app/api/sdk-verification/enrollment-jws`)

## Authentication

**Public endpoint** - No authentication required (designed for SDK webhook integration)

## Request Format

### Option 1: JWS Token (Recommended)

Send the complete JWS token from Uqudo SDK:

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Option 2: Direct Data (Backward Compatible)

Send the decoded JWT payload:

```json
{
  "data": {
    "source": { ... },
    "documents": [ ... ],
    "verifications": [ ... ],
    "backgroundCheck": { ... }
  }
}
```

## Complete JWS Token Structure

The JWS token contains:

```json
{
  "aud": "456edf22-e887-4a32-b2e5-334bf902831f",
  "exp": 1765444127,
  "iat": 1765442327,
  "iss": "https://id.uqudo.io",
  "jti": "f047c6c9-2cd1-47d9-ae7c-a847c96b65bc",
  "data": {
    "source": {
      "sdkType": "KYC_MOBILE",
      "sourceIp": "92.96.124.42",
      "sdkVersion": "3.6.1",
      "deviceModel": "SM-A256E",
      "deviceVersion": "16",
      "devicePlatform": "Android",
      "deviceManufacturer": "samsung"
    },
    "documents": [
      {
        "face": {
          "error": null,
          "match": true,
          "matchLevel": 5,
          "falseAcceptRate": null,
          "auditTrailImageId": "693a8313d1f667769efab07b"
        },
        "scan": {
          "front": {
            "gender": "M",
            "fullName": "Yahia Elhadi Hassan Elkanzi",
            "issueDate": "29/04/2025",
            "dateOfBirth": "08/06/1985",
            "nationality": "Sudan",
            "dateOfExpiry": "28/04/2027",
            "identityNumber": "784-1985-2038768-3",
            "dateOfBirthFormatted": "1985-06-08",
            "dateOfExpiryFormatted": "2027-04-28"
          },
          "back": {
            "sex": "M",
            "employer": "Uqudo Computer Systems Consultancies L.L.C",
            "occupation": "Information Technology Manager",
            "cardNumber": "145217945",
            "documentNumber": "145217945",
            "dateOfBirthFormatted": "1985-06-08"
          }
        },
        "reading": {
          "data": {
            "sex": "M",
            "title": "No Title",
            "idType": "IL",
            "fullName": "YAHIA,ELHADI,HASSAN,,,ELKANZI,",
            "idNumber": "784198520387683",
            "issueDate": "2025-04-29T04:00:00.000+04:00",
            "cardNumber": "145217945",
            "expiryDate": "2027-04-28T04:00:00.000+04:00",
            "occupation": "09552661",
            "companyName": "Uqudo Computer Systems Consultancies L.l.c",
            "dateOfBirth": "1985-06-08T00:00:00.000+00:00",
            "nationality": "SDN",
            "passportNumber": "P13244869",
            "passportCountry": "SDN",
            "passportIssueDate": "2025-02-11T00:00:00.000+00:00",
            "passportExpiryDate": "2035-02-10T00:00:00.000+00:00",
            "homeAddressEmail": "a.elhadi@uqu.do",
            "homeAddressMobilePhoneNo": "971504351311",
            "homeAddressResidentPhoneNo": "44444444",
            "residencyNumber": "20120252751011",
            "residencyExpiryDate": "2027-04-28T04:00:00.000+04:00",
            "sponsorName": "اوكودو لاستشارات اجهزة الحاسب الآلي ش.ذ.م.م",
            "sponsorUnifiedNumber": "05619987",
            "arabicNationality": "السودان",
            "arabicFullName": "يحى,الهادى,حسن,,,الكنزى,"
          }
        },
        "documentType": "UAE_ID"
      }
    ],
    "verifications": [
      {
        "reading": {
          "enabled": true,
          "passiveAuthentication": {
            "enabled": true,
            "documentDataSignatureValid": true,
            "countrySigningCertificateAvailable": true,
            "documentSigningCertificateAvailable": false
          }
        },
        "biometric": {
          "type": "FACIAL_RECOGNITION",
          "enabled": true,
          "matchLevel": 5
        },
        "mrzChecksum": {
          "valid": true,
          "enabled": true,
          "checkDigits": [
            {
              "valid": true,
              "fieldName": "documentNumber",
              "checkDigit": "8",
              "fieldValue": "145217945"
            },
            {
              "valid": true,
              "fieldName": "dateOfBirth",
              "checkDigit": "1",
              "fieldValue": "850608"
            },
            {
              "valid": true,
              "fieldName": "dateOfExpiry",
              "checkDigit": "7",
              "fieldValue": "270428"
            }
          ],
          "finalCheckDigit": "5"
        },
        "documentType": "UAE_ID",
        "sourceDetection": {
          "enabled": true,
          "optimalResolution": true,
          "selectedResolution": "2160x3840",
          "allowNonPhysicalDocuments": false
        },
        "idPrintDetection": {
          "score": 0,
          "enabled": true
        },
        "idScreenDetection": {
          "score": 16.04,
          "enabled": true
        },
        "dataConsistencyCheck": {
          "fields": [
            {
              "name": "fullName",
              "match": "MATCH",
              "sources": [
                {
                  "name": "fullName",
                  "value": "Yahia Elhadi Hassan Elkanzi",
                  "source": "SCAN",
                  "documentSide": "FRONT"
                },
                {
                  "name": "fullName",
                  "value": "YAHIA ELHADI HASSAN ELKANZI ",
                  "source": "READING"
                }
              ]
            }
          ],
          "enabled": true
        },
        "idPhotoTamperingDetection": {
          "score": 0.01,
          "enabled": true
        }
      }
    ],
    "backgroundCheck": {
      "type": "RDC",
      "match": true,
      "monitoringId": null,
      "content": {
        "alertDt": "2025-12-11T08:38:46",
        "nonReviewedAlertEntity": [
          {
            "sysId": "321962c101bed42e8e0d964f8e0f48e4",
            "rdcURL": "https://grid.rdc.eu.com/wss/entity.html?entityId=321962c101bed42e8e0d964f8e0f48e4",
            "entityId": 157923907,
            "entityTyp": "P",
            "entityName": "Yahya Hadi",
            "matchScore": 91,
            "riskScore": 90,
            "pepTypes": {
              "pepType": [
                {
                  "type": "AMB",
                  "level": 3,
                  "fromDate": "9/22/2011",
                  "position": "Deputy Consul (Social Affairs) - Consulate General of the French Republic in New York, United States Of America"
                }
              ]
            },
            "event": [
              {
                "eventDt": "2022-06-28",
                "eventDesc": "On List [PEP Connect - France]",
                "category": {
                  "categoryCode": "PEP",
                  "categoryDesc": "Person Political"
                },
                "subCategory": {
                  "categoryCode": "ASC",
                  "categoryDesc": "Associated with, Seen with"
                },
                "source": {
                  "format": "PEP_Connect",
                  "entityDt": "2025-09-24",
                  "sourceURL": "https://www.moodys.com/web/en/us/kyc/products/grid/grid-dataset-descriptions.html/#pep-connect",
                  "sourceName": "PEP Connect - France"
                }
              }
            ],
            "sources": {
              "source": [
                {
                  "headline": "PEP Connect - France",
                  "sourceURL": "https://www.moodys.com/web/en/us/kyc/products/grid/grid-dataset-descriptions.html/#pep-connect",
                  "sourceName": "PEP Connect - France"
                }
              ]
            },
            "postAddr": [
              {
                "locatorTyp": "PEP",
                "countryCode": {
                  "countryCodeValue": "FR"
                }
              },
              {
                "city": "New York City",
                "addr1": "934, Fifth Avenue",
                "stateProv": "New York",
                "postalCode": "10021",
                "countryCode": {
                  "countryCodeValue": "US"
                }
              }
            ],
            "attribute": [
              {
                "attCode": "PTY",
                "attVal": "AMB:L3",
                "attDesc": "PEP Type"
              },
              {
                "attCode": "SEX",
                "attVal": "Male",
                "attDesc": "Sex"
              }
            ],
            "rels": {
              "rel": []
            },
            "alias": [],
            "birthDt": [],
            "identification": []
          }
        ]
      }
    }
  }
}
```

## Response Format

### Success Response (with Background Check Match)

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
        "case_id": "BGC-1737110327",
        "database_case_id": 123,
        "case_type": "background_check_match",
        "priority": "critical",
        "matched_entities": [
          {
            "sys_id": "321962c101bed42e8e0d964f8e0f48e4",
            "entity_id": 157923907,
            "name": "Yahya Hadi",
            "entity_type": "P",
            "match_score": 91,
            "risk_score": 90,
            "rdc_url": "https://grid.rdc.eu.com/wss/entity.html?entityId=321962c101bed42e8e0d964f8e0f48e4",
            "pep_types": [
              {
                "type": "AMB",
                "level": 3,
                "fromDate": "9/22/2011",
                "position": "Deputy Consul (Social Affairs)..."
              }
            ],
            "events": [...],
            "sources": [...],
            "relationships": [],
            "addresses": [...],
            "birth_dates": [],
            "identifications": [],
            "attributes": [...]
          }
        ],
        "match_count": 2,
        "highest_risk_score": 90,
        "recommended_action": "ESCALATE",
        "monitoring_id": null,
        "alert_date": "2025-12-11T08:38:46"
      }
    },
    "account": {
      "account_id": "uuid-here",
      "account_created": true,
      "full_name": "Yahia Elhadi Hassan Elkanzi",
      "id_number": "784198520387683",
      "date_of_birth": "1985-06-08",
      "nationality": "SDN",
      "document_type": "UAE_ID",
      "card_number": "145217945",
      "gender": "M",
      "passport_number": "P13244869",
      "email": "a.elhadi@uqu.do",
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
  "message": "Verification approved. Background check match found - case BGC-1737110327 created."
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
      "passed_checks": true,
      "nfc_verified": true,
      "passive_authentication": true
    },
    "backgroundCheck": {
      "match": false,
      "case_created": false,
      "alert_created": false,
      "case_data": null
    },
    "account": {
      "account_id": "uuid-here",
      "account_created": true,
      "full_name": "John Doe",
      "id_number": "784-1990-1234567-8",
      "date_of_birth": "1990-01-01",
      "nationality": "UAE",
      "document_type": "UAE_ID",
      "nfc_verified": true,
      "passive_authentication": true
    },
    "source": {
      "sdk_type": "KYC_MOBILE",
      "sdk_version": "3.6.1",
      "device_model": "iPhone13,2",
      "device_platform": "iOS",
      "source_ip": "192.168.1.100"
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
      "warnings": [
        {
          "type": "DATA_CONSISTENCY",
          "fields": ["dateOfBirth"],
          "message": "Data inconsistency detected in: dateOfBirth"
        }
      ],
      "passed_checks": false,
      "nfc_verified": true,
      "passive_authentication": true
    },
    "backgroundCheck": {
      "match": false,
      "case_created": false,
      "alert_created": false,
      "case_data": null
    },
    "account": {...}
  },
  "message": "Verification rejected. No background check matches."
}
```

## What It Does Automatically

### 1. JWS Token Validation
- Decodes JWS token structure
- Validates token format
- TODO: Add signature verification with Uqudo public key

### 2. Document Verification
- **Priority 1**: NFC Reading data (most reliable)
  - Extracts all NFC chip data
  - Validates passive authentication
  - Verifies document data signature
- **Priority 2**: OCR Scan data (front/back of document)
  - Fallback if NFC reading unavailable
- Returns comprehensive account data

### 3. Fraud Detection
Validates against thresholds:
- **Screen Detection**: Rejects if score > 50
- **Print Detection**: Rejects if score > 50
- **Photo Tampering**: Rejects if score > 70
- **Face Match**: Requires minimum level 3/5
- **MRZ Checksum**: Validates all check digits
- **Data Consistency**: Checks consistency across sources (SCAN, READING)

### 4. Background Check Processing
If `backgroundCheck.match === true`:
- ✅ Extracts **all** matched entities with complete details
- ✅ Captures PEP types, events, sources, relationships, addresses
- ✅ Calculates risk scores (0-100)
- ✅ Determines case priority:
  - **Critical**: Risk score ≥ 90 → Action: ESCALATE
  - **High**: Risk score ≥ 70 → Action: REVIEW
  - **Medium**: Risk score < 70 → Action: REVIEW
- ✅ Stores monitoring ID and alert date

### 5. Automatic Database Operations
1. **Account Creation/Lookup**:
   - Searches for existing account by `id_number`
   - Creates new account if not found
   - Status: `pending_review` (approved) or `suspended` (rejected)
   - KYC Status: `verified` (NFC) or `pending` (Scan only)

2. **Alert Creation**:
   - Type: `background_check_match`
   - Priority: Based on risk score
   - Status: `open`
   - Notes: List of matched entities and risk scores

3. **AML Case Creation**:
   - Case ID: `BGC-{timestamp}`
   - Status: `unsolved`
   - Links alert IDs in `alert_ids` JSON field
   - Includes external RDC URL for investigation

4. **Audit Logging**:
   - Action: `SDK_ENROLLMENT_PROCESSED`
   - Captures full verification status and match count

## Verification Thresholds

| Check | Threshold | Action |
|-------|-----------|--------|
| Screen Detection | > 50 | REJECT |
| Screen Detection | > 30 | WARNING |
| Print Detection | > 50 | REJECT |
| Photo Tampering | > 70 | REJECT |
| Face Match Level | < 3 | REJECT |
| MRZ Checksum | Invalid | REJECT |

## Case Priority Mapping

| Risk Score | Case Priority | Recommended Action |
|-----------|--------------|-------------------|
| 90-100 | Critical | ESCALATE |
| 70-89 | High | REVIEW |
| 0-69 | Medium | REVIEW |

## Testing

### Test with cURL (JWS Token)

```bash
curl -X POST http://localhost:3000/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Test with Sample Payload

Save your sample JWS payload to `enrollment.json`:

```bash
curl -X POST http://localhost:3000/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant-id" \
  -d @enrollment.json
```

## Configuration

### Optional Headers

```
X-Tenant-ID: your-tenant-id-uuid
```

If not provided, uses default: `00000000-0000-0000-0000-000000000001`

### Environment Variables

No additional environment variables needed. Uses existing Supabase configuration.

## Integration Steps

1. **Configure Uqudo SDK** to send enrollment results to this endpoint
2. **Set webhook URL** in Uqudo dashboard:
   ```
   https://your-domain.com/api/sdk-verification/enrollment-jws
   ```
3. **Add tenant identification** via `X-Tenant-ID` header (optional)
4. **Monitor logs** for verification results and case creation

## Data Fields Captured

### From NFC Reading (Priority 1)
- Full name (English + Arabic)
- ID number, Card number
- Date of birth, Date of expiry, Issue date
- Nationality
- Gender/Sex
- Passport details (number, country, dates)
- Contact info (email, mobile phone, resident phone)
- Address details (home, work)
- Employment (company, occupation, sponsor)
- Residency details (number, expiry)

### From OCR Scan (Priority 2 - Fallback)
- Full name (English + Arabic)
- Identity number
- Date of birth, Date of expiry
- Nationality
- Gender
- Document number

### From Background Check (RDC)
- Entity name, ID, Type
- Match score, Risk score
- PEP types and positions
- Events (On List, sanctions, etc.)
- Source documents
- Relationships
- Addresses
- Birth dates
- Identifications
- Attributes

## Error Handling

All database operations are wrapped in try-catch blocks. If database operations fail, the endpoint still returns the verification results - it doesn't fail the entire request.

## Security Notes

1. **JWS Signature Verification**: Currently decodes without verification. TODO: Add Uqudo public key verification.
2. **Public Endpoint**: No authentication required by design (webhook integration).
3. **Tenant Isolation**: All data scoped by `tenant_id`.
4. **Rate Limiting**: Standard rate limits apply (100 requests per 15 minutes).

## Files

- **Implementation**: `/backend/routes/sdk-verification-jws.js`
- **Server Registration**: `/backend/server.js:94`
- **Documentation**: This file

---

**Status**: ✅ Ready for testing
**JWS Token Support**: ✅ Implemented
**NFC Reading Support**: ✅ Full support
**Background Check Integration**: ✅ Complete with auto-case creation
**Database Operations**: ✅ Automatic account, alert, and case creation

## Next Steps

1. Test with real Uqudo SDK JWS token
2. Add Uqudo public key for signature verification
3. Configure webhook URL in Uqudo dashboard
4. Monitor case creation in admin portal
