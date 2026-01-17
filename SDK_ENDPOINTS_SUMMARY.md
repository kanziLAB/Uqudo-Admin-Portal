# SDK Verification Endpoints - Quick Reference

## Available Endpoints

### 1. JWS Token Endpoint (NEW - Recommended)

**POST** `/api/sdk-verification/enrollment-jws`

Accepts JWS token from Uqudo SDK with complete validation and parsing.

**Request**:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Features**:
- ✅ JWS token decoding
- ✅ Full NFC reading data support
- ✅ Complete background check processing
- ✅ Automatic account creation
- ✅ Automatic alert creation
- ✅ Automatic AML case creation
- ✅ Comprehensive audit logging

**Documentation**: See `UQUDO_SDK_JWS_INTEGRATION.md`

---

### 2. Direct Data Endpoint (Original - Legacy)

**POST** `/api/sdk-verification/enrollment`

Accepts decoded JWT payload data directly (backward compatible).

**Request**:
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

**Features**:
- ✅ Document verification (scan data)
- ✅ Biometric verification
- ✅ Fraud detection
- ✅ Background check processing
- ✅ Returns case data (no DB creation)

**Documentation**: See `UQUDO_SDK_INTEGRATION.md`

---

## Comparison

| Feature | JWS Endpoint | Direct Data Endpoint |
|---------|-------------|---------------------|
| **JWS Token Support** | ✅ Yes | ❌ No |
| **NFC Reading Data** | ✅ Full support | ⚠️ Limited |
| **Account Creation** | ✅ Automatic | ❌ Manual |
| **Alert Creation** | ✅ Automatic | ❌ Manual |
| **Case Creation** | ✅ Automatic | ❌ Returns data only |
| **Passive Authentication** | ✅ Yes | ❌ No |
| **MRZ Validation** | ✅ Yes | ⚠️ Basic |
| **Data Consistency** | ✅ Yes | ❌ No |
| **Complete Entity Data** | ✅ Yes (PEP, events, sources) | ⚠️ Basic |

## Which Endpoint to Use?

### Use JWS Endpoint When:
- ✅ Receiving JWS tokens from Uqudo SDK
- ✅ Need NFC reading data (passport, chip data)
- ✅ Want automatic account/alert/case creation
- ✅ Need complete background check entity details
- ✅ Require passive authentication validation
- ✅ Want comprehensive audit trail

### Use Direct Data Endpoint When:
- Processing pre-decoded data
- Testing with sample payloads
- Need backward compatibility
- Manual control over DB operations

## Testing Commands

### Test JWS Endpoint:

```bash
# With JWS token
curl -X POST http://localhost:3000/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{"token": "eyJhbGciOiJSUzI1..."}'

# With file
curl -X POST http://localhost:3000/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant-id" \
  -d @enrollment-jws.json
```

### Test Direct Data Endpoint:

```bash
curl -X POST http://localhost:3000/api/sdk-verification/enrollment \
  -H "Content-Type: application/json" \
  -d '{"data": { ... }}'
```

## Configuration

### Optional Headers:

```
X-Tenant-ID: your-tenant-id-uuid
```

Default if not provided: `00000000-0000-0000-0000-000000000001`

### Webhook Configuration:

Configure in Uqudo Dashboard:

**Production URL**:
```
https://your-app.vercel.app/api/sdk-verification/enrollment-jws
```

**Local Testing**:
```
http://localhost:3000/api/sdk-verification/enrollment-jws
```

Or use ngrok for local webhook testing:
```bash
ngrok http 3000
# Use: https://your-id.ngrok.io/api/sdk-verification/enrollment-jws
```

## Response Structure

Both endpoints return similar structure:

```json
{
  "success": true,
  "data": {
    "verification": {
      "status": "approved|rejected",
      "issues": [...],
      "warnings": [...],
      "passed_checks": true|false,
      "nfc_verified": true|false,
      "passive_authentication": true|false
    },
    "backgroundCheck": {
      "match": true|false,
      "case_created": true|false,
      "alert_created": true|false,
      "case_data": {...}
    },
    "account": {
      "account_id": "uuid",
      "account_created": true|false,
      ...
    },
    "source": {
      "sdk_type": "KYC_MOBILE",
      ...
    }
  },
  "message": "..."
}
```

## Files

| File | Description |
|------|-------------|
| `/backend/routes/sdk-verification-jws.js` | NEW JWS endpoint implementation |
| `/backend/routes/sdk-verification.js` | Original direct data endpoint |
| `/backend/server.js` | Routes registration (line 93-94) |
| `UQUDO_SDK_JWS_INTEGRATION.md` | Complete JWS endpoint documentation |
| `UQUDO_SDK_INTEGRATION.md` | Original endpoint documentation |
| `SDK_ENDPOINTS_SUMMARY.md` | This file |

## Migration Path

If currently using the direct data endpoint:

1. ✅ Both endpoints remain available (backward compatible)
2. ✅ Update webhook URL to JWS endpoint when ready
3. ✅ Test with JWS tokens
4. ✅ Verify automatic case creation works
5. ✅ Monitor admin portal for new cases/alerts

No breaking changes - both endpoints work independently.

## Support

- **JWS Token Issues**: Check token format with jwt.io
- **Verification Failures**: Review thresholds in documentation
- **Database Issues**: Check Supabase connection and logs
- **Case Not Created**: Verify tenant_id and background check data

---

**Recommendation**: Use `/enrollment-jws` endpoint for all new integrations.

**Status**: ✅ Both endpoints ready for production
