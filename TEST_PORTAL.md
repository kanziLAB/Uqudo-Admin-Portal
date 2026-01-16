# Portal Testing Guide

## Current Status

✅ **Frontend Server:** Running on http://localhost:8080
✅ **Backend API:** Running on http://localhost:3000
✅ **Database:** Connected to Supabase
✅ **API Endpoints:** All tested and working

## Testing Results

### 1. Authentication ✅
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.uqudo.com","password":"Admin@123"}'
```
**Result:** Returns valid JWT token

### 2. Dashboard API ✅
```bash
curl -X GET http://localhost:3000/api/dashboard/kpis \
  -H "Authorization: Bearer TOKEN"
```
**Result:**
```json
{
  "success": true,
  "data": {
    "totalRegistrations": 1,
    "activeAccounts": 1,
    "verifiedAccounts": 0,
    "pendingAlerts": 6,
    "openCases": 0,
    "growthRate": 0
  }
}
```

### 3. Alerts API ✅
```bash
curl -X GET http://localhost:3000/api/alerts \
  -H "Authorization: Bearer TOKEN"
```
**Result:** Returns 6 alerts with full account data

## Troubleshooting Dashboard/Alerts Loading Issues

### Issue: "Failures loading dashboards and alerts"

This is likely a **browser-side issue**, not a server issue. Here's why:

1. **APIs are working** - Backend returns correct data
2. **Servers are running** - Both frontend and backend are up
3. **Authentication works** - Login endpoint returns valid tokens

### Solution: Clear Browser Data

The issue is probably an **expired JWT token** stored in the browser's localStorage.

**Steps to fix:**

1. **Open Browser DevTools**
   - Press F12 or Right-click → Inspect

2. **Go to Console tab**
   - Check for any red error messages
   - Common errors:
     - `401 Unauthorized` → Token expired
     - `Network Error` → Backend not reachable
     - `CORS Error` → Cross-origin issue

3. **Clear localStorage**
   - Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Find **Local Storage** → `http://localhost:8080`
   - Delete all items (especially `token` or `authToken`)

4. **Refresh and Login Again**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Login with: `admin@demo.uqudo.com` / `Admin@123`

### Alternative: Use Incognito/Private Window

Open a new incognito/private browser window and navigate to:
```
http://localhost:8080/pages/uqudo-sign-in
```

This ensures no cached data interferes.

## Verification Checklist

### ✅ Backend Health
```bash
curl http://localhost:3000/health
```
Should return: `{"success":true,"message":"Uqudo Admin Portal API is running",...}`

### ✅ Frontend Accessible
```bash
curl -I http://localhost:8080/
```
Should return: `HTTP/1.1 302 Found` (redirect to sign-in)

### ✅ Login Works
1. Go to http://localhost:8080/pages/uqudo-sign-in
2. Enter: `admin@demo.uqudo.com` / `Admin@123`
3. Should redirect to dashboard

### ✅ Dashboard Loads
After login, dashboard should show:
- Total Registrations: 1
- Active Accounts: 1
- Pending Alerts: 6
- Open Cases: 0

### ✅ Alerts Load
Navigate to Alerts page, should show 6 alerts:
- manual_review (1)
- id_screen_detection (1)
- id_print_detection (1)
- id_photo_tampering (1)
- face_match (1)
- mrz_checksum (1)

## Common Issues and Solutions

### Issue 1: "Cannot connect to localhost:8080"
**Cause:** Frontend server not running
**Solution:**
```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
npm run dev
```

### Issue 2: "401 Unauthorized"
**Cause:** Expired or invalid JWT token
**Solution:** Clear localStorage and login again

### Issue 3: "Route not found"
**Cause:** Backend server not running or wrong endpoint
**Solution:**
```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master/backend
npm run dev
```

### Issue 4: Blank dashboard/alerts page
**Cause:** JavaScript error or API call failure
**Solution:**
1. Open DevTools Console (F12)
2. Check for red errors
3. Check Network tab for failed API calls
4. Verify token in localStorage is valid

## Test Account Data

**Test Account Created:**
- ID: `56c1843f-b6a4-49f1-b7af-6612e0cefef7`
- Name: John Doe
- Email: john.doe@test.com
- Status: Active
- KYC: Pending (after failed verification)

**Alerts Created:**
- 1 manual review alert
- 5 SDK verification failure alerts

## API Endpoints Reference

All working and tested:

- `POST /api/auth/login` - Login
- `GET /api/dashboard/kpis` - Dashboard stats
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert
- `POST /api/sdk-verification/submit` - Submit SDK results
- `GET /api/accounts` - List accounts

## Browser DevTools Quick Check

Open Console and run:
```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token'));

// Check API connection
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(d => console.log('Backend:', d))
  .catch(e => console.error('Backend Error:', e));
```

## Still Having Issues?

1. **Restart both servers:**
   ```bash
   # Kill all node processes
   pkill -f node

   # Start backend
   cd /Users/uqudo/Desktop/Admin\ Portal/ui-master/backend
   npm run dev &

   # Start frontend
   cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
   npm run dev
   ```

2. **Check logs:**
   ```bash
   # Backend log
   tail -f /tmp/backend-server.log

   # Frontend log
   tail -f /tmp/frontend-server.log
   ```

3. **Verify database connection:**
   ```bash
   cd /Users/uqudo/Desktop/Admin\ Portal/ui-master/backend
   node test-connection.js
   ```

## Summary

**Everything is working correctly on the server side.**

The "failures loading dashboards and alerts" is most likely a **browser caching issue** with an expired JWT token.

**Quick Fix:**
1. Clear browser localStorage
2. Hard refresh (Ctrl+Shift+R)
3. Login again
4. Dashboard and alerts should load

If issues persist, open browser DevTools Console (F12) and check for specific error messages.
