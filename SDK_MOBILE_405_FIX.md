# Fixing 405 Error from Mobile SDK

## Issue
Getting **405 Method Not Allowed** when submitting SDK results from mobile app.

## Root Causes

405 errors typically occur due to:
1. ❌ Wrong HTTP method (GET instead of POST)
2. ❌ Wrong URL/endpoint path
3. ❌ CORS preflight failure
4. ❌ Missing Content-Type header
5. ❌ Server routing issue

## Solutions Applied

### 1. Added Explicit OPTIONS Handler
```javascript
router.options('/enrollment-jws', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-ID, Authorization');
  res.sendStatus(200);
});
```

### 2. Added Request Logging
Now all requests are logged to help debug:
```javascript
console.log('📱 SDK JWS Request:', {
  method: req.method,
  headers: req.headers,
  contentType: req.get('content-type')
});
```

### 3. Added Alternative Shorter Endpoint
In case mobile app is using different URL:
- ✅ `POST /api/sdk-verification/enrollment-jws` (main)
- ✅ `POST /api/sdk-verification/jws` (shorter alternative)
- ✅ `POST /api/sdk-verification/enrollment` (legacy, backward compatible)

### 4. Added Debug Catch-All
Any 405 error now returns helpful debug information:
```json
{
  "success": false,
  "error": "Method Not Allowed",
  "debug": {
    "method": "GET",
    "path": "/wrong-path",
    "allowedMethods": ["POST", "OPTIONS"],
    "availableEndpoints": [
      "POST /api/sdk-verification/enrollment-jws",
      "POST /api/sdk-verification/jws",
      "POST /api/sdk-verification/enrollment"
    ],
    "hint": "Make sure you are using POST method and correct endpoint URL"
  }
}
```

## Available Endpoints

### Primary Endpoint (Recommended)
```
POST /api/sdk-verification/enrollment-jws
Content-Type: application/json

{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Alternative Shorter URL
```
POST /api/sdk-verification/jws
Content-Type: application/json

{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Legacy Endpoint (Backward Compatible)
```
POST /api/sdk-verification/enrollment
Content-Type: application/json

{
  "data": { ... }
}
```

## Testing from Mobile

### Test with cURL (simulate mobile request)

```bash
# Test main endpoint
curl -X POST https://your-domain.com/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWS_TOKEN"}'

# Test shorter endpoint
curl -X POST https://your-domain.com/api/sdk-verification/jws \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWS_TOKEN"}'

# Test OPTIONS (preflight)
curl -X OPTIONS https://your-domain.com/api/sdk-verification/enrollment-jws \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Expected Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "verification": { ... },
    "backgroundCheck": { ... },
    "account": { ... }
  },
  "message": "Verification approved..."
}
```

**Error (400):**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "JWS token is required",
      "param": "token"
    }
  ]
}
```

**405 Debug Response:**
```json
{
  "success": false,
  "error": "Method Not Allowed",
  "debug": {
    "method": "GET",
    "path": "/enrollment-jws",
    "allowedMethods": ["POST", "OPTIONS"],
    "availableEndpoints": [...],
    "hint": "Make sure you are using POST method and correct endpoint URL"
  }
}
```

## Mobile App Configuration

### Check These Settings:

1. **URL Configuration**
   ```
   ✅ Correct: https://your-domain.com/api/sdk-verification/enrollment-jws
   ❌ Wrong: https://your-domain.com/sdk-verification/enrollment-jws (missing /api)
   ❌ Wrong: https://your-domain.com/api/sdk-verification (missing endpoint)
   ```

2. **HTTP Method**
   ```
   ✅ Correct: POST
   ❌ Wrong: GET, PUT, PATCH
   ```

3. **Headers Required**
   ```
   Content-Type: application/json
   ```

4. **Headers Optional**
   ```
   X-Tenant-ID: your-tenant-uuid
   ```

5. **Request Body**
   ```json
   {
     "token": "your-jws-token-from-uqudo-sdk"
   }
   ```

## CORS Configuration

The backend is configured to accept requests from any origin:

```javascript
const corsOptions = {
  origin: '*',  // Allows all origins
  credentials: true,
  optionsSuccessStatus: 200
};
```

**Headers Set:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, X-Tenant-ID, Authorization`

## Debugging Steps

### 1. Check Backend Logs

```bash
# View live logs
tail -f /tmp/backend-debug.log

# Look for these patterns:
# ✅ "📱 SDK JWS Request:" - Request received
# ✅ "📥 Received SDK verification request:" - Processing started
# ❌ "❌ 405 Method Not Allowed:" - Wrong method/path
```

### 2. Check Network Request from Mobile

In your mobile app, log:
- Request URL (full URL)
- Request Method (should be POST)
- Request Headers (especially Content-Type)
- Request Body (verify token is present)
- Response Status Code
- Response Body

### 3. Test with Postman/Insomnia

1. Create new request
2. Set method to POST
3. Set URL: `https://your-domain.com/api/sdk-verification/enrollment-jws`
4. Set header: `Content-Type: application/json`
5. Set body (raw JSON):
   ```json
   {
     "token": "test-token"
   }
   ```
6. Send request
7. Should get 400 (invalid token) NOT 405

### 4. Test CORS Preflight

```bash
curl -X OPTIONS https://your-domain.com/api/sdk-verification/enrollment-jws \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

Should return:
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: POST, OPTIONS
< Access-Control-Allow-Headers: Content-Type, X-Tenant-ID, Authorization
```

## Common Mistakes

### ❌ Wrong URL Format
```
// Missing /api prefix
https://your-domain.com/sdk-verification/enrollment-jws

// Should be:
https://your-domain.com/api/sdk-verification/enrollment-jws
```

### ❌ Wrong HTTP Method
```javascript
// Using GET
fetch(url, { method: 'GET' })

// Should be POST
fetch(url, { method: 'POST' })
```

### ❌ Missing Content-Type
```javascript
// Missing header
fetch(url, {
  method: 'POST',
  body: JSON.stringify({ token: 'xxx' })
})

// Should include Content-Type
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'xxx' })
})
```

### ❌ Sending to Wrong Port (Development)
```
// Wrong: Sending to frontend port
http://localhost:8080/api/sdk-verification/enrollment-jws

// Correct: Send to backend port
http://localhost:3000/api/sdk-verification/enrollment-jws
```

## Vercel Deployment Note

If deployed on Vercel, ensure `vercel.json` routes API requests correctly:

```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    }
  ]
}
```

## Still Getting 405?

If you're still getting 405 after checking all above:

1. **Check the exact URL** being hit from mobile
   - Add logging in mobile app
   - Verify full URL matches exactly

2. **Check if backend is receiving the request**
   - Look at backend logs
   - If no log entry → request not reaching backend
   - If log entry → backend processing issue

3. **Try the shorter alternative endpoint**
   ```
   POST /api/sdk-verification/jws
   ```

4. **Check for reverse proxy/load balancer**
   - Some hosting providers add layers
   - May need additional CORS configuration

5. **Contact Support**
   - Share backend logs showing the 405 error
   - Share mobile request logs (URL, method, headers)
   - Share response body

## Files Modified

- `/backend/routes/sdk-verification-jws.js` - Added OPTIONS handler, logging, alternative endpoints
- `/backend/server.js` - CORS already configured for all origins

## Testing Checklist

- [ ] Backend running and accessible
- [ ] Health check returns 200: `GET /health`
- [ ] OPTIONS preflight returns 200: `OPTIONS /api/sdk-verification/enrollment-jws`
- [ ] POST with token returns 400 (not 405): `POST /api/sdk-verification/enrollment-jws`
- [ ] Mobile app using POST method
- [ ] Mobile app has correct URL with `/api` prefix
- [ ] Mobile app setting `Content-Type: application/json`
- [ ] Mobile app sending token in request body

---

**Status**: ✅ Backend updated with debugging and multiple endpoints
**Next Step**: Test from mobile app and check logs for detailed error information
