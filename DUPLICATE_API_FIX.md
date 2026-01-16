# Duplicate API Variable Fix

## Issue Fixed

**Error:** `Uncaught SyntaxError: Identifier 'api' has already been declared`

**Location:** Multiple pages (accounts.html, cases.html, blocklist.html, kyc-setup.html)

## Root Cause

The `api` variable was being declared twice:

1. **First declaration:** In `assets/js/api-client.js` (line 453)
   ```javascript
   // Create global API client instance
   const api = new ApiClient();
   ```

2. **Second declaration:** In each HTML page's inline script
   ```javascript
   const api = new ApiClient();
   ```

This caused a `SyntaxError` because `const` variables cannot be redeclared.

## Solution

Removed the duplicate `const api = new ApiClient();` declarations from all HTML pages.

The `api` instance is already created globally in `api-client.js` and is available to all pages that include that script.

## Files Fixed

### 1. `/pages/accounts.html` (line 544)
**Before:**
```javascript
<script>
  const api = new ApiClient();
  let accounts = [];
```

**After:**
```javascript
<script>
  // api is already defined globally in api-client.js
  let accounts = [];
```

### 2. `/pages/cases.html` (line 607)
**Before:**
```javascript
<script>
  const api = new ApiClient();
  let cases = [];
```

**After:**
```javascript
<script>
  // api is already defined globally in api-client.js
  let cases = [];
```

### 3. `/pages/blocklist.html` (line 425)
**Before:**
```javascript
<script>
  const api = new ApiClient();
  let entries = [];
```

**After:**
```javascript
<script>
  // api is already defined globally in api-client.js
  let entries = [];
```

### 4. `/pages/kyc-setup.html` (line 524)
**Before:**
```javascript
<script>
  const api = new ApiClient();

  // Initialize page
```

**After:**
```javascript
<script>
  // api is already defined globally in api-client.js

  // Initialize page
```

## How It Works Now

1. When a page loads, it includes `api-client.js`:
   ```html
   <script src="../assets/js/api-client.js"></script>
   ```

2. `api-client.js` creates a global `api` instance:
   ```javascript
   const api = new ApiClient();
   ```

3. All page scripts can now use `api` directly without declaring it:
   ```javascript
   // Use api directly
   const accounts = await api.getAccounts();
   const alerts = await api.getAlerts();
   ```

## Testing

After the fix, all pages should load without JavaScript errors:

- ✅ accounts.html - No duplicate declaration error
- ✅ cases.html - No duplicate declaration error
- ✅ blocklist.html - No duplicate declaration error
- ✅ kyc-setup.html - No duplicate declaration error

## Other Pages Status

These pages were already correct and didn't have duplicate declarations:
- ✅ uqudo-sign-in.html
- ✅ uqudo-dashboard.html
- ✅ alerts.html

## Browser DevTools Verification

To verify the fix:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to any of the fixed pages
4. Should see no red errors about duplicate declarations
5. Can test `api` is available: Type `api` in console and press Enter
   - Should show: `ApiClient {baseURL: "http://localhost:3000/api", ...}`

## Summary

The error was caused by trying to declare the same `const` variable twice. Since `api-client.js` already creates a global `api` instance, individual pages don't need to declare it again.

**Fix:** Removed duplicate declarations, added comments for clarity.

**Result:** All pages now work without JavaScript errors.
