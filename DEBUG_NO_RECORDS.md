# Debug: SDK Submitted But No Records in Portal

## Issue
SDK result submitted to `https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws` but no account/alert/case appearing in admin portal.

## Possible Causes

### 1. Request Failed/Not Received
- Network error from mobile
- 405/404/500 error response
- Request timeout

### 2. Wrong Tenant ID
- Record created in different tenant
- Default tenant vs your tenant mismatch

### 3. Database Error
- Missing environment variables
- Supabase connection issue
- Database insert failed silently

### 4. No Background Check Match
- Endpoint only creates alert/case if background check has matches
- Account should still be created even without matches

### 5. Token Validation Failed
- Invalid JWS token format
- Endpoint returned 400 before processing

---

## Step 1: Check Vercel Function Logs

### Go to Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select your project: `uqudo-admin-portal`
3. Click **"Logs"** or **"Functions"** tab
4. Look for recent requests to `/api/sdk-verification/enrollment-jws`

### What to Look For:

**✅ Success Log:**
```
📱 SDK JWS Request: { method: 'POST', ... }
📥 Received SDK verification request: { sdkType: 'KYC_MOBILE', ... }
🚨 Background check found X matches
✅ Found existing account: uuid OR ✅ Created new account: uuid
✅ Created alert: uuid
✅ Created AML case: BGC-xxxxx
```

**❌ Error Logs:**
```
Invalid JWS token format
Database operation failed: ...
Could not find the 'xxx' column...
```

### Action:
- [ ] Check Vercel logs for the request
- [ ] Note any error messages

---

## Step 2: Check Mobile Response

### On Mobile Side:

Log the response from the API call:

```kotlin
// Android
Log.d("SDK", "Status: ${response.code}")
Log.d("SDK", "Body: ${response.body}")
```

```swift
// iOS
print("Status: \(response.statusCode)")
print("Body: \(response.body)")
```

### Expected Response:

**Success (200):**
```json
{
  "success": true,
  "data": {
    "verification": {
      "status": "approved",
      "passed_checks": true
    },
    "backgroundCheck": {
      "match": true/false,
      "case_created": true/false,
      "alert_created": true/false
    },
    "account": {
      "account_id": "uuid-here",
      "account_created": true
    }
  }
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Action:
- [ ] Check mobile app logs for response
- [ ] Note the status code and response body
- [ ] Copy the response: `_________________________________`

---

## Step 3: Check Tenant ID

The endpoint uses tenant ID from header or defaults to demo tenant.

### Check Admin Portal Tenant:

1. Login to admin portal
2. Open browser console (F12)
3. Run:
   ```javascript
   JSON.parse(localStorage.getItem('user_data')).tenantId
   ```
4. Copy the tenant ID

### Check Request Tenant:

Did you send `X-Tenant-ID` header from mobile?

**If NO:** Request used default tenant: `00000000-0000-0000-0000-000000000001`

**If YES:** What tenant ID was sent?

### Solution:

**Option A:** Add tenant ID header to mobile request:
```kotlin
// Android
.addHeader("X-Tenant-ID", "your-actual-tenant-id")
```

**Option B:** Check records in default tenant:
```sql
-- In Supabase SQL Editor
SELECT * FROM accounts
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC
LIMIT 10;
```

### Action:
- [ ] Your portal tenant ID: `_________________________________`
- [ ] Mobile sending tenant header? Yes / No
- [ ] If yes, tenant ID sent: `_________________________________`

---

## Step 4: Check Supabase Directly

### Go to Supabase:

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"Table Editor"**

### Check Tables:

**Accounts Table:**
```sql
SELECT id, user_id, full_name, id_number, created_at, tenant_id
FROM accounts
ORDER BY created_at DESC
LIMIT 10;
```

**Alerts Table:**
```sql
SELECT id, account_id, alert_type, priority, status, created_at, tenant_id
FROM kyc_alerts
ORDER BY created_at DESC
LIMIT 10;
```

**Cases Table:**
```sql
SELECT id, case_id, account_id, resolution_status, match_count, created_at, tenant_id
FROM aml_cases
ORDER BY created_at DESC
LIMIT 10;
```

### Action:
- [ ] Any new records in accounts table? Yes / No
- [ ] Any new records in kyc_alerts table? Yes / No
- [ ] Any new records in aml_cases table? Yes / No
- [ ] If yes, what tenant_id? `_________________________________`

---

## Step 5: Check Environment Variables

### In Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select project
3. Settings → Environment Variables

### Verify These Are Set:

- [ ] `SUPABASE_URL` - Set and correct
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Set (should be service_role, NOT anon)
- [ ] `JWT_SECRET` - Set
- [ ] `CORS_ORIGIN` - Set

### Get Correct Keys from Supabase:

1. Supabase Dashboard → Settings → API
2. Copy:
   - **URL**: `https://xxx.supabase.co`
   - **service_role key** (NOT anon key!)

### Action:
- [ ] All environment variables set in Vercel
- [ ] Using service_role key (not anon key)

---

## Step 6: Test with cURL

### Test the endpoint manually:

```bash
curl -X POST https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: YOUR-ACTUAL-TENANT-ID" \
  -d '{"token":"test-token"}' \
  -v
```

### Expected Response:
```json
{
  "success": false,
  "error": "Invalid JWS token format"
}
```

This confirms endpoint is working (400 is expected for invalid token).

### Action:
- [ ] cURL test completed
- [ ] Response: `_________________________________`

---

## Common Issues & Solutions

### Issue 1: Records in Wrong Tenant

**Symptom:** Records created but not visible in portal

**Check:**
```sql
-- Find all recent accounts regardless of tenant
SELECT id, user_id, full_name, tenant_id, created_at
FROM accounts
ORDER BY created_at DESC
LIMIT 20;
```

**Solution:**
Add `X-Tenant-ID` header to mobile requests matching your portal tenant.

---

### Issue 2: Database Connection Failed

**Symptom:** Vercel logs show database errors

**Check Vercel Logs For:**
```
Database operation failed: ...
PGRST204: Could not find the 'xxx' column
Connection refused
```

**Solution:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is service role (not anon)
- Check Supabase project is active
- Verify table schema matches code

---

### Issue 3: No Background Check Match

**Symptom:** Account created but no alert/case

**Expected Behavior:**
- If background check has NO matches → Only account created
- If background check HAS matches → Account + Alert + Case created

**Check Response:**
```json
{
  "backgroundCheck": {
    "match": false,  // ← No matches found
    "case_created": false
  },
  "account": {
    "account_created": true  // ← Account still created
  }
}
```

**Solution:**
This is normal. Only accounts with background check matches get alerts/cases.

---

### Issue 4: Invalid Token Format

**Symptom:** Mobile gets 400 error

**Vercel Logs Show:**
```
Invalid JWS token format
Failed to decode JWS token
```

**Solution:**
- Ensure mobile is sending actual JWS token from Uqudo SDK
- Token should be a long Base64 JWT string
- Format: `{"token": "eyJhbGciOiJSUzI1..."}`

---

### Issue 5: Silent Failure

**Symptom:** 200 response but no records

**Check Vercel Logs:**
Look for "Database operation failed" - endpoint catches errors and continues.

**Solution:**
- Check logs for specific error
- Verify database permissions
- Check table schema

---

## Quick Diagnosis Steps

### 1. Check if request reached Vercel:
- [ ] View Vercel function logs
- [ ] See "📱 SDK JWS Request" log?

### 2. Check response from mobile:
- [ ] Status code: `______`
- [ ] success: true/false
- [ ] account_created: true/false

### 3. Check Supabase:
- [ ] Run SQL: `SELECT * FROM accounts ORDER BY created_at DESC LIMIT 5`
- [ ] Any recent records?
- [ ] What tenant_id?

### 4. Check tenant mismatch:
- [ ] Portal tenant: `________________`
- [ ] Mobile tenant header: `________________` or (default)
- [ ] Do they match?

---

## Solution Summary

Based on symptoms, most likely causes:

### If Mobile Got 400/500 Error:
→ Check Vercel logs for error message
→ Check environment variables

### If Mobile Got 200 Success:
→ Check tenant ID mismatch
→ Check Supabase for records in different tenant

### If No Logs in Vercel:
→ Request didn't reach Vercel
→ Check mobile network logs
→ Verify URL is correct

### If Logs Show Database Error:
→ Check environment variables
→ Verify service_role key
→ Check table schema

---

## Next Steps

1. **Check Vercel Logs First** - Most informative
   - Go to: https://vercel.com/dashboard → Your Project → Logs
   - Look for POST `/api/sdk-verification/enrollment-jws`

2. **Share Information:**
   - [ ] Vercel log output (screenshot or copy)
   - [ ] Mobile response (status code + body)
   - [ ] Portal tenant ID
   - [ ] Any error messages

3. **Quick Test:**
   ```bash
   # Test with your actual tenant ID
   curl -X POST https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws \
     -H "Content-Type: application/json" \
     -H "X-Tenant-ID: YOUR-PORTAL-TENANT-ID" \
     -d @test-payload.json
   ```

---

## Contact Points

Share these when asking for help:

1. **Vercel Logs**: Screenshot from Functions/Logs tab
2. **Mobile Response**: Status code and response body
3. **Tenant IDs**: Portal tenant vs request tenant
4. **Supabase Query**: Results from accounts table query
5. **Environment Variables**: Confirm which are set (not the values)

---

**Most Likely Issue**: Tenant ID mismatch - records created in default tenant, portal viewing different tenant.

**Quick Fix**: Add `X-Tenant-ID` header to mobile request with your portal's tenant ID.
