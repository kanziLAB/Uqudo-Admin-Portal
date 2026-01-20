-- Migration: Create sdk_sessions table for storing individual SDK verification sessions
-- Run this migration in Supabase SQL Editor

-- Create sdk_sessions table
CREATE TABLE IF NOT EXISTS sdk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Session identification
  session_id TEXT NOT NULL,  -- JTI or unique session identifier from SDK

  -- User information (denormalized for quick access)
  first_name TEXT,
  last_name TEXT,
  id_number TEXT,
  document_type TEXT,

  -- Verification status
  verification_status TEXT DEFAULT 'pending',  -- pending, approved, rejected, manual_review

  -- SDK data storage (JSONB for flexibility)
  sdk_source JSONB,           -- Source info (sdkType, sdkVersion, devicePlatform, etc.)
  sdk_analytics JSONB,        -- Processed analytics events
  sdk_trace JSONB,            -- Raw trace events from SDK
  sdk_verifications JSONB,    -- Verification results (face match, liveness, etc.)
  sdk_documents JSONB,        -- Document data extracted
  fraud_scores JSONB,         -- Fraud detection scores

  -- Metadata
  verification_channel TEXT,  -- 'web' or 'mobile'
  platform TEXT,              -- iOS, Android, Web
  sdk_version TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_tenant_id ON sdk_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_account_id ON sdk_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_session_id ON sdk_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_created_at ON sdk_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_verification_status ON sdk_sessions(verification_status);

-- Add unique constraint on session_id per tenant (prevent duplicate sessions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sdk_sessions_unique_session
ON sdk_sessions(tenant_id, session_id);

-- Add RLS policies
ALTER TABLE sdk_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see sessions from their tenant
CREATE POLICY "Users can view own tenant sessions" ON sdk_sessions
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policy: Users can insert sessions for their tenant
CREATE POLICY "Users can insert own tenant sessions" ON sdk_sessions
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policy: Users can update sessions for their tenant
CREATE POLICY "Users can update own tenant sessions" ON sdk_sessions
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add comment for documentation
COMMENT ON TABLE sdk_sessions IS 'Stores individual SDK verification sessions for analytics tracking';
COMMENT ON COLUMN sdk_sessions.session_id IS 'Unique session identifier (JTI) from the SDK';
COMMENT ON COLUMN sdk_sessions.sdk_trace IS 'Complete raw trace events from SDK for detailed analytics';
COMMENT ON COLUMN sdk_sessions.fraud_scores IS 'Fraud detection scores (screen, print, tampering detection)';
