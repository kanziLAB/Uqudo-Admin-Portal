# Accounts Page Enhancements - Complete

## Overview
Enhanced the accounts page with SDK version display, intelligent status determination, and automatic face image fetching/display.

---

## ✅ Completed Features

### 1. Verification Column - SDK Version Display

**What Changed**: The Verification column now shows whether the account was created via Mobile SDK, Web SDK, or manually.

**Implementation**:
- Reads `sdk_source.sdkType` from account data
- Displays icon and label based on SDK type:
  - 📱 **Mobile**: Green phone icon + "Mobile v5.2.0"
  - 🌐 **Web**: Blue language icon + "Web v3.1.0"
  - ✏️ **Manual**: Gray edit icon + "Manual"

**Code**: `pages/accounts.html` lines 1132-1180
```javascript
function getSDKVersionLabel(account) {
  if (!account.sdk_source) return 'Manual';

  const sdkType = account.sdk_source.sdkType?.toLowerCase() || '';
  const sdkVersion = account.sdk_source.sdkVersion || '';

  if (sdkType.includes('mobile') || sdkType.includes('android') || sdkType.includes('ios')) {
    return `Mobile ${sdkVersion ? 'v' + sdkVersion : ''}`.trim();
  } else if (sdkType.includes('web') || sdkType.includes('browser')) {
    return `Web ${sdkVersion ? 'v' + sdkVersion : ''}`.trim();
  }

  return sdkVersion ? `SDK v${sdkVersion}` : 'SDK';
}
```

**Visual Example**:
```
Verification Column:
┌────────────────┐
│ 📱 Mobile v5.2 │  (Green icon - Mobile SDK)
│ 🌐 Web v3.1    │  (Blue icon - Web SDK)
│ ✏️ Manual      │  (Gray icon - Manual entry)
└────────────────┘
```

---

### 2. Status Column - Intelligent Status Determination

**What Changed**: Account status now considers AML hits and verification scores, not just the raw account status field.

**Logic**:
1. **If AML match found** → Show "Under Review" (regardless of account status)
2. **If face match score < 2** → Show "Rejected" (low confidence match)
3. **If liveness confidence < 0.5** → Show "Rejected" (potential spoofing)
4. **Otherwise** → Show actual account status

**Implementation**: `pages/accounts.html` lines 1194-1218
```javascript
function getAccountStatusWithAML(account) {
  // If account has AML match, it should show under review or rejected
  if (account.aml_status === 'aml_match_found') {
    return 'under_review';
  }

  // If scores are very low (potential fraud)
  if (account.sdk_verifications && account.sdk_verifications.length > 0) {
    const verification = account.sdk_verifications[0];

    // Check face match score
    if (verification.faceMatch && verification.faceMatch.matchLevel < 2) {
      return 'rejected';
    }

    // Check liveness confidence
    if (verification.liveness && verification.liveness.confidence < 0.5) {
      return 'rejected';
    }
  }

  // Otherwise return actual status
  return account.account_status || account.status || 'pending';
}
```

**Status Badge Colors**:
- 🟢 **Active**: Green badge
- 🟡 **Pending / Under Review**: Yellow badge
- 🔴 **Rejected**: Red badge
- ⚪ **Suspended**: Gray badge

**Example Scenarios**:

| Account Status | AML Status | Face Match | Liveness | Displayed Status |
|---------------|------------|------------|----------|------------------|
| Active | aml_clear | 4/5 | 0.95 | **Active** (green) |
| Active | aml_match_found | 4/5 | 0.95 | **Under Review** (yellow) |
| Active | aml_clear | 1/5 | 0.95 | **Rejected** (red) |
| Active | aml_clear | 4/5 | 0.3 | **Rejected** (red) |
| Pending | aml_clear | 4/5 | 0.95 | **Pending** (yellow) |

---

### 3. Face Image Integration

**What Changed**: Accounts now display actual face selfie images from SDK verification instead of initials avatars.

**Complete Flow**:

```
┌──────────────────┐
│  Mobile SDK      │
│  User completes  │
│  verification    │
└────────┬─────────┘
         │ JWS Token with sessionId
         ▼
┌────────────────────────────────┐
│  Backend: sdk-verification-jws │
│                                │
│  1. Create/Update Account      │
│  2. Call fetchImagesFromUqudoAPI│
│     - POST to Uqudo Info API   │
│     - Pass sessionId           │
│     - Get face image URL/base64│
│  3. Store in database          │
└────────┬───────────────────────┘
         │ Images stored
         ▼
┌────────────────────────────────┐
│  Database: accounts table      │
│                                │
│  - face_image_url              │
│  - face_image_base64           │
│  - document_front_url          │
│  - document_back_url           │
│  - images_fetched_at           │
└────────┬───────────────────────┘
         │ Retrieved by frontend
         ▼
┌────────────────────────────────┐
│  Frontend: Accounts Page       │
│                                │
│  - Table: Shows face in avatar │
│  - Detail Modal: Large face    │
│    image with verification     │
│    badge                       │
└────────────────────────────────┘
```

#### A. Backend - Uqudo Info API Integration

**File**: `backend/routes/sdk-verification-jws.js`

**Added Function** (lines 147-186):
```javascript
async function fetchImagesFromUqudoAPI(sessionId, token) {
  try {
    console.log(`📸 Fetching images for session: ${sessionId}`);

    // Uqudo Info API endpoint
    const infoApiUrl = process.env.UQUDO_INFO_API_URL || 'https://id.uqudo.io/api/v2/info';

    const response = await fetch(infoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || process.env.UQUDO_API_TOKEN}`
      },
      body: JSON.stringify({
        sessionId: sessionId
      })
    });

    if (!response.ok) {
      console.error(`❌ Info API request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Info API response received for session: ${sessionId}`);

    // Extract image URLs or base64 data
    return {
      faceImageUrl: data.faceImage || data.selfieImage || null,
      faceImageBase64: data.faceImageBase64 || data.selfieBase64 || null,
      documentFrontUrl: data.documentFront || data.idFront || null,
      documentBackUrl: data.documentBack || data.idBack || null,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to fetch images from Uqudo Info API:', error.message);
    return null;
  }
}
```

**Integration** (lines 505-561):
- Called immediately after account creation
- Uses `source.sessionId` from SDK payload
- Stores images in database with update query
- Also fetches for existing accounts if not already fetched
- Non-blocking: Won't fail account creation if image fetch fails

#### B. Database Schema

**File**: `DATABASE_MIGRATION_FACE_IMAGES.sql`

**Columns Added**:
```sql
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS face_image_url TEXT,
ADD COLUMN IF NOT EXISTS document_front_url TEXT,
ADD COLUMN IF NOT EXISTS document_back_url TEXT,
ADD COLUMN IF NOT EXISTS face_image_base64 TEXT,
ADD COLUMN IF NOT EXISTS images_fetched_at TIMESTAMP WITH TIME ZONE;
```

**Purpose**:
- `face_image_url`: URL to face selfie (if returned by Info API)
- `face_image_base64`: Base64 encoded face image for immediate display
- `document_front_url`: Front of document image
- `document_back_url`: Back of document image
- `images_fetched_at`: Timestamp when images were fetched

**Index Added**:
```sql
CREATE INDEX IF NOT EXISTS idx_accounts_images_fetched
ON accounts(images_fetched_at)
WHERE images_fetched_at IS NOT NULL;
```

#### C. Frontend Display

**Accounts Table** (lines 728-751):
```javascript
const hasFaceImage = account.face_image_url || account.face_image_base64;

${hasFaceImage ? `
  <div class="account-avatar" style="padding: 0; overflow: hidden;">
    <img src="${account.face_image_base64 ? 'data:image/jpeg;base64,' + account.face_image_base64 : account.face_image_url}"
         alt="Face"
         style="width: 100%; height: 100%; object-fit: cover;"
         onerror="this.parentElement.innerHTML='${initials}'; ...">
  </div>
` : `
  <div class="account-avatar" style="background: ${avatarColor};">
    ${initials}
  </div>
`}
```

**Features**:
- Prefers base64 over URL (faster initial load)
- Graceful fallback to initials if image fails to load
- Maintains circular avatar shape
- Object-fit: cover ensures proper cropping

**Account Detail Modal** (lines 400-411, 876-887):
```html
<!-- Large centered face image with verification badge -->
<div class="row mb-4" id="face-image-section" style="display: none;">
  <div class="col-12 text-center">
    <div style="display: inline-block; position: relative;">
      <img id="detail-face-image" src="" alt="Face Image"
           style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover;
                  border: 4px solid #1e88e5; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="position: absolute; bottom: 10px; right: 10px; background: #4caf50;
                  width: 24px; height: 24px; border-radius: 50%; border: 3px solid white;">
        <i class="material-symbols-rounded" style="font-size: 14px; color: white;">check</i>
      </div>
    </div>
  </div>
</div>
```

**JavaScript**:
```javascript
if (account.face_image_url || account.face_image_base64) {
  faceImage.src = account.face_image_base64
    ? `data:image/jpeg;base64,${account.face_image_base64}`
    : account.face_image_url;
  faceImageSection.style.display = 'block';
} else {
  faceImageSection.style.display = 'none';
}
```

**Visual Example**:

```
Accounts Table Row:
┌─────────────────────────────────────────────────────────────┐
│  [Photo]  John Doe                    📱 Mobile v5.2.0      │
│           ID: 12345678...             🟢 Active             │
│           john@example.com            🟢 AML Clear          │
└─────────────────────────────────────────────────────────────┘

Account Detail Modal:
┌──────────────────────────────────────┐
│                                      │
│          [Large Face Photo]          │
│              with ✅ badge           │
│                                      │
│  Personal Information                │
│  ├─ Full Name: John Doe              │
│  ├─ DOB: 1990-01-15                  │
│  └─ ...                              │
└──────────────────────────────────────┘
```

---

## Environment Variables

**Required for Info API**:
Add to `.env` file:

```env
# Uqudo Info API Configuration
UQUDO_INFO_API_URL=https://id.uqudo.io/api/v2/info
UQUDO_API_TOKEN=your_uqudo_api_token_here
```

**Note**: Token can also be passed from mobile SDK in Authorization header

---

## Database Migration Required

Run this SQL in Supabase SQL Editor:

```sql
-- From DATABASE_MIGRATION_FACE_IMAGES.sql
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS face_image_url TEXT,
ADD COLUMN IF NOT EXISTS document_front_url TEXT,
ADD COLUMN IF NOT EXISTS document_back_url TEXT,
ADD COLUMN IF NOT EXISTS face_image_base64 TEXT,
ADD COLUMN IF NOT EXISTS images_fetched_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN accounts.face_image_url IS 'URL to face selfie image from SDK';
COMMENT ON COLUMN accounts.document_front_url IS 'URL to document front image';
COMMENT ON COLUMN accounts.document_back_url IS 'URL to document back image';
COMMENT ON COLUMN accounts.face_image_base64 IS 'Base64 encoded face image for quick display';
COMMENT ON COLUMN accounts.images_fetched_at IS 'Timestamp when images were fetched from Uqudo API';

-- Create index
CREATE INDEX IF NOT EXISTS idx_accounts_images_fetched
ON accounts(images_fetched_at)
WHERE images_fetched_at IS NOT NULL;
```

---

## Testing Checklist

### Test 1: SDK Version Display
1. Navigate to Accounts page
2. Check Verification column
3. **Verify**:
   - Mobile SDK accounts show 📱 "Mobile vX.X.X" (green)
   - Web SDK accounts show 🌐 "Web vX.X.X" (blue)
   - Manual accounts show ✏️ "Manual" (gray)

### Test 2: Smart Status
1. Create account with AML match
2. Check Status column shows "Under Review" (yellow)
3. Create account with low face match score
4. Check Status column shows "Rejected" (red)

### Test 3: Face Image Integration
1. Complete SDK verification from mobile app
2. Wait for account creation (check Vercel logs)
3. Navigate to Accounts page
4. **Verify**:
   - Avatar shows actual face photo (not initials)
   - Click "View Details"
   - Large face image displays at top of modal
   - Green checkmark badge visible

### Test 4: Fallback Behavior
1. Account without face image
2. **Verify**:
   - Table shows initials avatar
   - Detail modal doesn't show image section
3. Account with broken image URL
4. **Verify**:
   - Falls back to initials avatar
   - No broken image icon

---

## Files Changed

| File | Changes | Lines |
|------|---------|-------|
| `backend/routes/sdk-verification-jws.js` | Added fetchImagesFromUqudoAPI(), image fetching logic | +100 |
| `pages/accounts.html` | SDK version display, smart status, face image rendering | +140 |
| `DATABASE_MIGRATION_FACE_IMAGES.sql` | Database schema for images | NEW |

---

## API Flow Diagram

```
Mobile SDK Verification
         ↓
POST /api/sdk-verification/enrollment-jws
   ├─ Decode JWS token
   ├─ Extract source.sessionId
   ├─ Create/Update Account
   ├─ buildAnalyticsEvents() → Store analytics
   └─ fetchImagesFromUqudoAPI()
         ↓
      POST to Uqudo Info API
      {
        "sessionId": "abc123"
      }
         ↓
      Response:
      {
        "faceImage": "https://...",
        "faceImageBase64": "iVBORw0KG...",
        "documentFront": "https://...",
        "documentBack": "https://..."
      }
         ↓
      Store in accounts table:
      ├─ face_image_url
      ├─ face_image_base64
      ├─ document_front_url
      ├─ document_back_url
      └─ images_fetched_at
         ↓
      Frontend retrieves and displays
```

---

## Troubleshooting

### Issue: Face images not showing

**Symptoms**:
- Avatars show initials instead of photos
- `images_fetched_at` is NULL in database

**Diagnosis**:
```sql
SELECT
  id,
  first_name,
  last_name,
  face_image_url,
  face_image_base64,
  images_fetched_at
FROM accounts
ORDER BY created_at DESC
LIMIT 10;
```

**Solutions**:
1. Check Vercel logs for Info API errors
2. Verify `UQUDO_INFO_API_URL` environment variable
3. Verify `UQUDO_API_TOKEN` is set
4. Check Info API endpoint is accessible
5. Verify SDK sends valid `sessionId` in source

### Issue: Verification column shows "Manual" for SDK accounts

**Cause**: `sdk_source` not stored in database

**Solution**:
1. Run `DATABASE_MIGRATION_SDK_ANALYTICS.sql` first
2. Complete a NEW SDK verification
3. Verify `sdk_source` is populated:
```sql
SELECT sdk_source FROM accounts WHERE sdk_source IS NOT NULL LIMIT 1;
```

### Issue: Status shows wrong value

**Cause**: AML or verification scores not considered

**Solution**:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Verify `getAccountStatusWithAML()` function is defined
- Check `sdk_verifications` and `aml_status` are populated

---

## Benefits

### 1. Better User Identification
- **Before**: Generic initials avatars (JD, SM, etc.)
- **After**: Actual face photos for quick visual recognition

### 2. SDK Version Tracking
- **Before**: Unknown how account was created
- **After**: Clear indication: Mobile v5.2.0, Web v3.1.0, or Manual

### 3. Intelligent Status
- **Before**: Status field might say "Active" even with AML hits
- **After**: Status reflects AML, fraud scores, and verification quality

### 4. Enhanced Trust
- **Before**: No visual confirmation of identity
- **After**: Face photo with verification badge builds trust

---

## Performance Considerations

### Image Fetching
- **Non-blocking**: Won't fail account creation if Info API is down
- **One-time fetch**: Only fetches once per account (checks `images_fetched_at`)
- **Async operation**: Doesn't delay SDK enrollment response

### Image Display
- **Base64 preferred**: Faster initial load, no external request
- **Lazy evaluation**: Only loads images for visible accounts
- **Fallback**: Graceful degradation to initials if image fails

### Database
- **Indexed**: `images_fetched_at` indexed for fast queries
- **Optional**: Images are optional, won't break existing functionality
- **Text storage**: URLs stored as TEXT (efficient)

---

## Security Considerations

### API Token
- Store in environment variable (`UQUDO_API_TOKEN`)
- Never commit to git
- Can use token from SDK Authorization header

### Image Storage
- Consider CDN for production (currently stores URLs)
- Base64 is safe for display (no XSS risk with data: URLs)
- Validate image types from Info API

### Privacy
- Face images are sensitive PII
- Ensure compliance with GDPR/data protection laws
- Provide option to delete images if user requests

---

## Next Steps

### Potential Enhancements
1. **Image zoom**: Click face image to view full size
2. **Document images**: Display front/back of document in modal
3. **Image verification**: Show if face matches document photo
4. **Bulk image fetch**: Backfill images for existing accounts
5. **Image upload**: Allow manual image upload for manual entries

---

**Status**: ✅ Complete and Ready for Testing
**Version**: 2.2.0
**Date**: 2026-01-17

---

## Quick Reference

### Helper Functions Added
- `getSDKVersionLabel(account)` - Returns "Mobile v5.2.0", "Web v3.1.0", or "Manual"
- `getSDKVerificationIcon(account)` - Returns icon name based on SDK type
- `getSDKVerificationColor(account)` - Returns color class for icon
- `getAccountStatusWithAML(account)` - Returns intelligent status based on AML + scores

### Environment Variables
```env
UQUDO_INFO_API_URL=https://id.uqudo.io/api/v2/info
UQUDO_API_TOKEN=your_token_here
```

### Database Columns
- `face_image_url` (TEXT)
- `face_image_base64` (TEXT)
- `document_front_url` (TEXT)
- `document_back_url` (TEXT)
- `images_fetched_at` (TIMESTAMP)
