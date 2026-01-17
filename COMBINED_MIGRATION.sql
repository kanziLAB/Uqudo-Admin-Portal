-- ============================================================================
-- COMBINED DATABASE MIGRATION
-- Date: 2026-01-17
-- Description: Adds SDK analytics and face images columns to accounts table
-- ============================================================================

-- ============================================================================
-- PART 1: SDK ANALYTICS COLUMNS
-- ============================================================================

-- Add SDK analytics columns
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sdk_source JSONB,
ADD COLUMN IF NOT EXISTS sdk_verifications JSONB,
ADD COLUMN IF NOT EXISTS sdk_documents JSONB,
ADD COLUMN IF NOT EXISTS sdk_analytics JSONB;

-- Add comments for SDK columns
COMMENT ON COLUMN accounts.sdk_source IS 'SDK source information (sdkType, version, device, platform)';
COMMENT ON COLUMN accounts.sdk_verifications IS 'SDK verification results (face match, liveness, document checks)';
COMMENT ON COLUMN accounts.sdk_documents IS 'SDK document data (scan, NFC reading)';
COMMENT ON COLUMN accounts.sdk_analytics IS 'SDK analytics events for performance journey';

-- Create index for SDK analytics
CREATE INDEX IF NOT EXISTS idx_accounts_sdk_analytics ON accounts USING GIN (sdk_analytics);

-- ============================================================================
-- PART 2: FACE IMAGES COLUMNS
-- ============================================================================

-- Add face images columns
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS face_image_url TEXT,
ADD COLUMN IF NOT EXISTS document_front_url TEXT,
ADD COLUMN IF NOT EXISTS document_back_url TEXT,
ADD COLUMN IF NOT EXISTS face_image_base64 TEXT,
ADD COLUMN IF NOT EXISTS images_fetched_at TIMESTAMP WITH TIME ZONE;

-- Add comments for image columns
COMMENT ON COLUMN accounts.face_image_url IS 'URL to face selfie image from SDK';
COMMENT ON COLUMN accounts.document_front_url IS 'URL to document front image';
COMMENT ON COLUMN accounts.document_back_url IS 'URL to document back image';
COMMENT ON COLUMN accounts.face_image_base64 IS 'Base64 encoded face image for quick display';
COMMENT ON COLUMN accounts.images_fetched_at IS 'Timestamp when images were fetched from Uqudo API';

-- Create index for images
CREATE INDEX IF NOT EXISTS idx_accounts_images_fetched
ON accounts(images_fetched_at)
WHERE images_fetched_at IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all new columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
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

-- Verify indexes were created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'accounts'
AND indexname IN ('idx_accounts_sdk_analytics', 'idx_accounts_images_fetched');

-- Show sample of accounts table structure
SELECT
    COUNT(*) as total_accounts,
    COUNT(sdk_analytics) as accounts_with_analytics,
    COUNT(face_image_url) as accounts_with_face_images,
    COUNT(images_fetched_at) as accounts_with_images_fetched
FROM accounts;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- ✅ SDK Analytics Columns Added:
--    - sdk_source (JSONB): Stores SDK type, version, device info
--    - sdk_verifications (JSONB): Stores verification results
--    - sdk_documents (JSONB): Stores document data
--    - sdk_analytics (JSONB): Stores analytics events array
--
-- ✅ Face Images Columns Added:
--    - face_image_url (TEXT): URL to face selfie
--    - face_image_base64 (TEXT): Base64 encoded face image
--    - document_front_url (TEXT): URL to document front
--    - document_back_url (TEXT): URL to document back
--    - images_fetched_at (TIMESTAMP): When images were fetched
--
-- ✅ Indexes Created:
--    - idx_accounts_sdk_analytics (GIN index on sdk_analytics)
--    - idx_accounts_images_fetched (Index on images_fetched_at)
--
-- ============================================================================
