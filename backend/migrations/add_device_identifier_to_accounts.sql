-- Migration: Add device_identifier column to accounts table
-- Date: 2026-01-28
-- Description: Add device_identifier for device history tracking in analytics

-- Add device_identifier column to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS device_identifier TEXT;

-- Create index for device history queries
CREATE INDEX IF NOT EXISTS idx_accounts_device_identifier
ON accounts(tenant_id, device_identifier);

-- Backfill device_identifier from sdk_source JSONB for existing records
UPDATE accounts
SET device_identifier = sdk_source->>'deviceIdentifier'
WHERE device_identifier IS NULL
  AND sdk_source IS NOT NULL
  AND sdk_source->>'deviceIdentifier' IS NOT NULL;

-- Backfill device_identifier from sdk_trace array (Web SDK stores it in trace events)
UPDATE accounts
SET device_identifier = (sdk_trace->0->>'deviceIdentifier')
WHERE device_identifier IS NULL
  AND sdk_trace IS NOT NULL
  AND jsonb_array_length(sdk_trace) > 0
  AND sdk_trace->0->>'deviceIdentifier' IS NOT NULL;

-- Backfill device_identifier using fingerprint from sdk_source (sourceIp + deviceModel + devicePlatform)
-- This creates a consistent identifier for devices that don't provide explicit deviceIdentifier
UPDATE accounts
SET device_identifier = 'fp_' ||
    regexp_replace(
      COALESCE(sdk_source->>'sourceIp', '') || '_' ||
      COALESCE(sdk_source->>'deviceModel', '') || '_' ||
      COALESCE(sdk_source->>'devicePlatform', ''),
      '[^a-zA-Z0-9_.-]', '_', 'g'
    )
WHERE device_identifier IS NULL
  AND sdk_source IS NOT NULL
  AND (
    sdk_source->>'sourceIp' IS NOT NULL OR
    sdk_source->>'deviceModel' IS NOT NULL OR
    sdk_source->>'devicePlatform' IS NOT NULL
  );

-- Add comment for documentation
COMMENT ON COLUMN accounts.device_identifier IS 'Device identifier - explicit from SDK or fingerprint from device info (sourceIp + deviceModel + devicePlatform)';
