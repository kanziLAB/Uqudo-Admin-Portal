-- Add SDK analytics columns to accounts table
-- This stores the complete SDK verification data for performance journey

-- Add columns for SDK analytics data
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_sdk_analytics ON accounts USING GIN (sdk_analytics);

-- Example data structure for sdk_analytics:
-- [
--   {
--     "name": "VIEW_SCAN",
--     "type": "ENROLLMENT",
--     "status": "success",
--     "duration": 8200,
--     "timestamp": "2024-01-17T17:00:47Z",
--     "id": "GENERIC_ID",
--     "details": {
--       "screen": "document_capture"
--     }
--   },
--   {
--     "name": "START_SCAN",
--     "type": "SCAN",
--     "status": "success",
--     "duration": 279,
--     "timestamp": "2024-01-17T17:00:55Z",
--     "id": "GENERIC_ID",
--     "details": {
--       "document_type": "passport",
--       "quality": 0.87
--     }
--   },
--   {
--     "name": "FINISH_SCAN",
--     "type": "SCAN",
--     "status": "success",
--     "duration": 0,
--     "timestamp": "2024-01-17T17:00:56Z",
--     "id": "GENERIC_ID",
--     "details": {
--       "verification_status": "approved"
--     }
--   }
-- ]
