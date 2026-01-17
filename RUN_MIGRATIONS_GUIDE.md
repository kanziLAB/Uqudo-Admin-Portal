# 🚀 How to Run Database Migrations

## Quick Start (2 minutes)

The database columns need to be added manually in Supabase SQL Editor. Follow these steps:

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **kpmcigujptbolpdlfojo**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run the Migration

1. Open the file: `COMBINED_MIGRATION.sql`
2. Copy **ALL** the SQL (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Success

You should see output showing:
- 9 new columns added
- 2 indexes created
- Verification results

**Expected columns**:
```
✅ sdk_source
✅ sdk_verifications
✅ sdk_documents
✅ sdk_analytics
✅ face_image_url
✅ face_image_base64
✅ document_front_url
✅ document_back_url
✅ images_fetched_at
```

---

## Alternative: Run Each Migration Separately

If you prefer to run migrations one at a time:

### Migration 1: SDK Analytics

```sql
-- Add SDK analytics columns
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sdk_source JSONB,
ADD COLUMN IF NOT EXISTS sdk_verifications JSONB,
ADD COLUMN IF NOT EXISTS sdk_documents JSONB,
ADD COLUMN IF NOT EXISTS sdk_analytics JSONB;

-- Add comments
COMMENT ON COLUMN accounts.sdk_source IS 'SDK source information (sdkType, version, device, platform)';
COMMENT ON COLUMN accounts.sdk_verifications IS 'SDK verification results (face match, liveness, document checks)';
COMMENT ON COLUMN accounts.sdk_documents IS 'SDK document data (scan, NFC reading)';
COMMENT ON COLUMN accounts.sdk_analytics IS 'SDK analytics events for performance journey';

-- Create index
CREATE INDEX IF NOT EXISTS idx_accounts_sdk_analytics ON accounts USING GIN (sdk_analytics);
```

### Migration 2: Face Images

```sql
-- Add face images columns
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

## Verification Query

Run this to verify all columns were added:

```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
AND column_name IN (
    'sdk_source',
    'sdk_verifications',
    'sdk_documents',
    'sdk_analytics',
    'face_image_url',
    'document_front_url',
    'document_back_url',
    'face_image_base64',
    'images_fetched_at'
)
ORDER BY column_name;
```

**Expected output**: 9 rows showing all the new columns

---

## Troubleshooting

### Error: "column already exists"
**This is OK!** It means the migration was already run. Just continue.

### Error: "permission denied"
Make sure you're logged in with admin/owner permissions in Supabase.

### Can't find SQL Editor
- It's in the left sidebar of Supabase Dashboard
- Looks like: 📝 SQL Editor

---

## After Migration Success

Once the SQL runs successfully:

1. **Test immediately**: Complete a new SDK verification from mobile app
2. **Check accounts page**: Refresh and verify:
   - Verification column shows "Mobile vX.X.X" or "Web vX.X.X"
   - Face images appear in avatars (after SDK submission)
   - Status reflects AML hits and scores

3. **Monitor Vercel logs**: Check that images are being fetched from Uqudo Info API

---

## Environment Variables Needed

After migrations, ensure these are set in Vercel:

```env
UQUDO_INFO_API_URL=https://id.uqudo.io/api/v2/info
UQUDO_API_TOKEN=your_uqudo_api_token_here
```

---

## Quick Checklist

- [ ] Open Supabase SQL Editor
- [ ] Copy COMBINED_MIGRATION.sql
- [ ] Run in SQL Editor
- [ ] Verify 9 columns added
- [ ] Set UQUDO_INFO_API_URL in Vercel
- [ ] Set UQUDO_API_TOKEN in Vercel
- [ ] Test with new SDK submission
- [ ] Verify face images appear

---

**Total time**: ~2 minutes
**Difficulty**: Easy (copy/paste)
**Reversible**: Yes (columns can be dropped if needed)

---

## Need Help?

Check the output of the verification query. If all 9 columns appear, you're ready to go! 🎉
