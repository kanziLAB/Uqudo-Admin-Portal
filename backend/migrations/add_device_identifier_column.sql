-- Migration: Add device_identifier column to sdk_sessions for efficient device history queries
-- Run this migration in Supabase SQL Editor

-- Add device_identifier column
ALTER TABLE sdk_sessions
ADD COLUMN IF NOT EXISTS device_identifier TEXT;

-- Create index for device history queries
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_device_identifier
ON sdk_sessions(tenant_id, device_identifier);

-- Backfill device_identifier from sdk_source JSONB for existing records
UPDATE sdk_sessions
SET device_identifier = sdk_source->>'deviceIdentifier'
WHERE device_identifier IS NULL
  AND sdk_source IS NOT NULL
  AND sdk_source->>'deviceIdentifier' IS NOT NULL;

-- Backfill device_identifier from sdk_trace array (Web SDK stores it in trace events)
-- Extract from first trace event that has deviceIdentifier
UPDATE sdk_sessions
SET device_identifier = (sdk_trace->0->>'deviceIdentifier')
WHERE device_identifier IS NULL
  AND sdk_trace IS NOT NULL
  AND jsonb_array_length(sdk_trace) > 0
  AND sdk_trace->0->>'deviceIdentifier' IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN sdk_sessions.device_identifier IS 'Device identifier extracted from sdk_source or sdk_trace for efficient device history queries';
