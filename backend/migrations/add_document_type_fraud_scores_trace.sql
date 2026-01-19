-- Migration: Add document_type, fraud_scores, and sdk_trace columns to accounts table
-- Date: 2026-01-19
-- Description:
--   - document_type: Store document type from SDK (UAE_ID, PASSPORT, etc.)
--   - fraud_scores: Store fraud detection scores (idPrintDetection, idScreenDetection, etc.)
--   - sdk_trace: Store complete trace events for analytics

-- Add document_type column
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);

-- Add fraud_scores JSONB column for storing all fraud detection scores
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS fraud_scores JSONB;

-- Add sdk_trace JSONB column for storing complete trace events
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sdk_trace JSONB;

-- Add sdk_analytics, sdk_source, sdk_verifications, sdk_documents if they don't exist
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sdk_analytics JSONB;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sdk_source JSONB;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sdk_verifications JSONB;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS sdk_documents JSONB;

-- Create index on document_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_accounts_document_type ON accounts(document_type);

-- Create GIN index on fraud_scores for JSONB queries
CREATE INDEX IF NOT EXISTS idx_accounts_fraud_scores ON accounts USING GIN (fraud_scores);

-- Create GIN index on sdk_trace for JSONB queries
CREATE INDEX IF NOT EXISTS idx_accounts_sdk_trace ON accounts USING GIN (sdk_trace);

-- Add comment for documentation
COMMENT ON COLUMN accounts.document_type IS 'Document type from SDK verification (UAE_ID, PASSPORT, DRIVING_LICENSE, etc.)';
COMMENT ON COLUMN accounts.fraud_scores IS 'Fraud detection scores from SDK: idPrintDetection, idScreenDetection, idPhotoTamperingDetection, dataConsistencyCheck';
COMMENT ON COLUMN accounts.sdk_trace IS 'Complete trace events array from SDK for analytics';
