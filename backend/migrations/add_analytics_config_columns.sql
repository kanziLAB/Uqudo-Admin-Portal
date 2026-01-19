-- Migration: Add analytics_config and sdk_verification_thresholds columns to kyc_setup table
-- Run this migration in Supabase SQL Editor

-- Add sdk_verification_thresholds column (JSONB)
ALTER TABLE kyc_setup
ADD COLUMN IF NOT EXISTS sdk_verification_thresholds JSONB DEFAULT '{
  "face_match": 80,
  "liveness": 70,
  "document_quality": 60,
  "face_quality": 70,
  "ocr_confidence": 80,
  "nfc_reading": 90,
  "passive_authentication": 85,
  "background_check_risk": 70
}'::jsonb;

-- Add analytics_config column (JSONB)
ALTER TABLE kyc_setup
ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT '{
  "ux_benchmarks": {
    "document_scan": 30,
    "nfc_reading": 15,
    "face_verification": 20,
    "background_check": 5
  },
  "risk_thresholds": {
    "low": 50,
    "medium": 100,
    "high": 200
  },
  "friction_thresholds": {
    "low": 30,
    "medium": 70
  },
  "device_risk": {
    "multiple_attempts_threshold": 2,
    "low_success_rate_threshold": 50,
    "rapid_retry_window_minutes": 60,
    "fraud_flags_threshold": 5
  },
  "portfolio_defaults": {
    "default_date_range": "30",
    "completion_rate_target": 85,
    "abandonment_rate_target": 10,
    "review_rate_target": 20
  }
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN kyc_setup.sdk_verification_thresholds IS 'SDK verification threshold settings for face match, liveness, document quality, etc.';
COMMENT ON COLUMN kyc_setup.analytics_config IS 'Analytics configuration including UX benchmarks, risk thresholds, friction thresholds, device risk indicators, and portfolio dashboard defaults';
