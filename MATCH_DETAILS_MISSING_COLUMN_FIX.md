# Match Details Missing Column - ROOT CAUSE FOUND

**Date**: 2026-01-17
**Status**: 🔴 **CRITICAL - DATABASE MIGRATION REQUIRED**

---

## ROOT CAUSE IDENTIFIED ✅

The `match_details` column **DOES NOT EXIST** in the `aml_cases` table!

**Error from database**:
```
Could not find the 'match_details' column of 'aml_cases' in the schema cache
```

---

## Why Match Details Shows "No match details available"

1. ✅ Backend code is correct (stores match_details)
2. ✅ Frontend code is correct (reads match_details)
3. ❌ **DATABASE COLUMN MISSING** - Inserts fail silently

When the backend tries to insert a case with `match_details`:
```javascript
await supabaseAdmin.from('aml_cases').insert({
  // ... other fields
  match_details: {  // ← This field doesn't exist in the table!
    matched_entities: matchedEntities,
    match_count: 2,
    highest_risk_score: 90
  }
})
```

Supabase ignores the unknown field and inserts the rest, resulting in NULL for match_details.

---

## Current Database Schema

```sql
aml_cases table columns:
  - id
  - tenant_id
  - account_id
  - case_id
  - match_count
  - resolution_status
  - external_case_url
  - action_by
  - last_updated_time
  - created_at
  - alert_ids (JSONB)
  - match_details ← MISSING!
```

---

## Required Migration

### SQL to Run in Supabase

**Go to**: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/sql/new

**Paste and Run**:
```sql
-- Add match_details column to aml_cases table
ALTER TABLE aml_cases
ADD COLUMN IF NOT EXISTS match_details JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN aml_cases.match_details IS 'JSONB column storing detailed match information including matched_entities array, match_count, and highest_risk_score';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_aml_cases_match_details
ON aml_cases USING GIN (match_details);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'aml_cases' AND column_name = 'match_details';
```

---

## After Running Migration

### Step 1: Verify Column Exists

Run this diagnostic script:
```bash
node backend/check-schema.js
```

Should show:
```
✅ Insert successful!
   Case ID: TEST-XXXXX
   Match Details: Present ✅
```

### Step 2: Complete New SDK Verification

The column must exist BEFORE creating new cases.

### Step 3: Check Match Details

Cases created AFTER the migration will have match_details:
```bash
node backend/check-cases.js
```

Should show:
```
Case 1: BGC-XXXXX
  Match Count: 2
  Match Details: Present ✅
  Match Details Content:
  {
    "matched_entities": [...],
    "match_count": 2,
    "highest_risk_score": 90
  }
```

### Step 4: Check Admin Portal

**Cases Page → View Details → Match Details Tab**:
- Badge shows: "Match Details (2)" with red badge
- Shows all matched entities with full details

---

## Why This Column Was Missing

Looking at the codebase, there are migration scripts:
- `COMBINED_MIGRATION.sql`
- `DATABASE_MIGRATION_SDK_ANALYTICS.sql`
- `DATABASE_MIGRATION_FACE_IMAGES.sql`

But **none of them add the `match_details` column** to `aml_cases` table!

The backend code was updated to store match_details (commit df4e62f), but the database migration was never created or run.

---

## What Happens After Migration

### For Old Cases (Before Migration)
❌ Will continue to show "No match details available"
- match_details field is NULL
- Cannot retroactively populate (matched_entities data not stored)

### For New Cases (After Migration)
✅ Will show full match details
- match_details stored with matched_entities array
- Badge shows correct count
- All entity information visible

---

## Testing Checklist

After running the SQL migration:

- [ ] Run `node backend/check-schema.js` - verify column exists
- [ ] Push latest commit to trigger Vercel redeploy
- [ ] Complete NEW SDK verification from mobile
- [ ] Run `node backend/check-cases.js` - verify match_details is Present
- [ ] Check Vercel logs for "📊 Match details: {...}"
- [ ] Open Cases page in admin portal
- [ ] Click case → Match Details tab
- [ ] Verify badge shows count and entities display

---

## Summary

### Problem
Match details showing "No match details available" even for cases with matches.

### Root Cause
`match_details` column doesn't exist in `aml_cases` table.

### Solution
Run SQL migration to add the column.

### Impact
- **Before migration**: All cases show "No match details available"
- **After migration**: New cases will have full match details

### Action Required
**YOU MUST RUN THE SQL MIGRATION** in Supabase SQL Editor before match details will work.

---

**Status**: 🔴 **WAITING FOR DATABASE MIGRATION**

**Files to Push** (after migration):
- `c8592d7` - Force rebuild with timestamp
- All previous commits

**SQL Migration File**: `ADD_MATCH_DETAILS_COLUMN.sql`

**Supabase SQL Editor**: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/sql/new

---

**CRITICAL**: Run the migration NOW, then push the code and test with a new SDK verification.
