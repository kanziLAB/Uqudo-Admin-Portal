# Testing Checklist - Match Details Fix

**Date**: 2026-01-17
**Status**: ✅ Ready to Test

---

## ✅ Prerequisites Complete

- [x] Database migration executed (match_details column added)
- [x] Column verified (exists and queryable)
- [x] Code deployed to Vercel
- [x] All commits pushed

---

## 🧪 Testing Steps

### Step 1: Complete NEW SDK Verification

**IMPORTANT**: The fix only works for NEW verifications created AFTER the database migration.

1. Open your mobile app
2. Start a new SDK verification
3. Complete all steps (document scan, NFC if applicable, face capture)
4. Submit the verification
5. **Note the time**: ________________

### Step 2: Wait for Background Processing

Wait 10-20 seconds for the backend to:
- Process the JWS token
- Create account (if new)
- Run background check
- Create AML case with match_details

### Step 3: Check Vercel Logs

**Go to**: https://vercel.com/yelkanzi-4760s-projects/uqudo-admin-portal/logs

**Filter by time**: Look for logs around the verification time

**Look for these log messages**:
```
📥 Received SDK verification request: {
  hasTraceEvents: true/false,
  traceEventsCount: X
}

📊 Creating AML case with X matched entities
📊 Match details: {
  "matched_entities": [...],
  "match_count": 2,
  "highest_risk_score": 90
}

✅ Created AML case: BGC-XXXXX with match_details stored
```

**Expected**:
- ✅ Should see "Creating AML case with X matched entities"
- ✅ Should see the match_details JSON payload
- ✅ Should see "with match_details stored"

**If you see errors**:
- ❌ "Failed to create case" - Share the error message

### Step 4: Check Database

Run this diagnostic script:
```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master
node backend/check-recent-data.js
```

**Expected output**:
```
🚨 AML Cases created in last 2 hours: X

1. Case ID: BGC-XXXXX
   Created: [recent timestamp]
   Match Count: 2
   Match Details: Present ✅
   Match Details Content:
   {
     "matched_entities": [
       { "name": "Yahya Hadi", ... },
       { "name": "Yahya Hassan", ... }
     ],
     "match_count": 2,
     "highest_risk_score": 90
   }
```

**Result**:
- [ ] Match Details shows "Present ✅"
- [ ] match_details content displays correctly

### Step 5: Check Admin Portal - Cases Page

1. Navigate to **Cases** page
2. Find the newly created case (should be at the top)
3. **Check the case list**:
   - Case ID: BGC-XXXXX
   - Match Count: 2
   - Status: Unsolved (blue badge)

4. **Click "View Details"** button

### Step 6: Verify Case Detail Modal

**Modal should open with tabs**:
- Overview
- Match Details (with badge)
- Resolution Workflow

**Check Match Details Tab**:
- [ ] Badge shows: "Match Details (**2**)" with **red** badge
- [ ] Click "Match Details" tab
- [ ] Should see: "Found 2 Match(es)    Risk Score: 90"
- [ ] Should show Match #1: Yahya Hadi
  - Entity Type: PEP
  - Risk Score: 90
  - Event details
  - Category: PEP: Person Political
- [ ] Should show Match #2: Yahya Hassan
  - Entity Type: PEP
  - Risk Score: 90
  - Event details
  - Category: PEP: Person Political

**Check Resolution Workflow Tab**:
- [ ] Click "Resolution Workflow" tab
- [ ] Should show: ● Case Opened (with timestamp)
- [ ] Other steps show "Pending"

### Step 7: Check Performance Journey (Bonus)

**In Alerts page**:
1. Navigate to **Alerts** page
2. Find the alert for the new verification
3. Click "View Details"
4. Check **Performance Journey** tab

**Expected** (if SDK sends trace events):
- VIEW → START → FACE_MATCH → LIVENESS → FINISH
- Real timestamps and durations

**If not** (SDK doesn't send trace):
- START → NFC_READING → FINISH
- Synthetic events (fallback)

---

## ✅ Success Criteria

### Match Details Working
- [x] Database column exists
- [ ] Vercel logs show match_details being stored
- [ ] Database query shows match_details Present
- [ ] Admin portal displays match details correctly
- [ ] Badge shows correct count (2)
- [ ] All matched entities visible with details

### Performance Journey (Optional)
- [ ] If SDK configured: Shows real trace events
- [ ] If SDK not configured: Shows synthetic events (fallback)

---

## 🐛 Troubleshooting

### Issue: Match Details Still Showing "No match details available"

**Check**:
1. Is this a NEW case created AFTER the migration?
2. Check Vercel logs - was match_details stored?
3. Run `node backend/check-recent-data.js` - does it show Present?

**If database shows Present but UI shows "No match details available"**:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for JavaScript errors

### Issue: Badge Shows "0" Instead of Count

**Check**:
1. Inspect element on badge - check the value
2. Open browser DevTools console
3. Check for JavaScript errors in console

**Possible causes**:
- Frontend not reading match_details correctly
- Old cached JavaScript

### Issue: Vercel Logs Don't Show Match Details

**Check**:
1. Was background check successful?
2. Were there actually matches?
3. Check for errors in logs

---

## 📊 Expected Timeline

| Time | Event |
|------|-------|
| T+0s | Complete SDK verification |
| T+5s | Backend receives JWS token |
| T+10s | Background check completes |
| T+15s | Case created with match_details |
| T+20s | Case visible in admin portal |

---

## 🎯 Final Verification

After completing all steps above:

**OLD Cases** (created before migration):
- ❌ Will continue showing "No match details available"
- ❌ Cannot be fixed (data was never stored)

**NEW Cases** (created after migration):
- ✅ Should show full match details
- ✅ Badge shows correct count
- ✅ All entities visible with complete information

---

**Status**: ⏳ **WAITING FOR NEW SDK VERIFICATION TEST**

**Next Step**: Complete a NEW SDK verification and follow the testing steps above.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
