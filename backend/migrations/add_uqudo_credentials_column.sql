-- Migration: Add QR verification columns to kyc_setup table
-- These columns store QR verification configuration and Uqudo API credentials

-- Add the qr_config column as JSONB (stores QR verification settings)
ALTER TABLE kyc_setup
ADD COLUMN IF NOT EXISTS qr_config JSONB;

-- Add the uqudo_credentials column as JSONB (stores Uqudo API credentials)
ALTER TABLE kyc_setup
ADD COLUMN IF NOT EXISTS uqudo_credentials JSONB;

-- Add comments explaining the column structures
COMMENT ON COLUMN kyc_setup.qr_config IS 'QR verification configuration. Structure: { base_url: string, deep_link_scheme: string, universal_link_base: string, token_expiry_minutes: number, default_journey_id: string, one_time_use: boolean, session_tracking: boolean }';

COMMENT ON COLUMN kyc_setup.uqudo_credentials IS 'Uqudo API credentials for QR verification. Structure: { client_id: string, client_secret: string, auth_url: string }';

-- Example qr_config:
-- {
--   "base_url": "https://uqudo-admin-portal.vercel.app",
--   "deep_link_scheme": "uqudo://verify",
--   "universal_link_base": "https://uqudo.app/verify",
--   "token_expiry_minutes": 5,
--   "default_journey_id": null,
--   "one_time_use": true,
--   "session_tracking": true
-- }

-- Example uqudo_credentials:
-- {
--   "client_id": "456edf22-e887-4a32-b2e5-334bf902831f",
--   "client_secret": "9OPYykfpSPWVr0uCTgeaER9hTLsStlhWd2SI3JA7ycWAcOvUawUtKZJW7fGE9dbx",
--   "auth_url": "https://auth.uqudo.io/api/oauth/token"
-- }
