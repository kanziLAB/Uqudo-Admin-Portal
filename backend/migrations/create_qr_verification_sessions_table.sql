-- Migration: Create QR Verification Sessions Table
-- Description: Stores QR-based verification session data for B2B customer flows
-- Created: 2025-01-31

-- Create QR verification sessions table
CREATE TABLE IF NOT EXISTS qr_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(50) NOT NULL UNIQUE,
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of token (never store raw tokens)

    -- Customer identification (B2B)
    customer_id VARCHAR(100) DEFAULT 'default',
    customer_name VARCHAR(255) DEFAULT 'Uqudo',

    -- Verification configuration
    journey_id VARCHAR(100), -- Uqudo journey ID
    reference_id VARCHAR(255), -- Customer's reference (e.g., application ID, visa number)

    -- Deep link and QR data
    deep_link TEXT,

    -- Session status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'initialized', 'completed', 'failed', 'expired')),

    -- Device information (captured when mobile app scans QR)
    device_info JSONB DEFAULT '{}',

    -- Additional metadata
    metadata JSONB DEFAULT '{}',

    -- Verification result (populated after completion)
    verification_result JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    initialized_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Audit fields
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_qr_sessions_session_id ON qr_verification_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token_hash ON qr_verification_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_customer_id ON qr_verification_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON qr_verification_sessions(status);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_created_at ON qr_verification_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_reference_id ON qr_verification_sessions(reference_id) WHERE reference_id IS NOT NULL;

-- Add RLS (Row Level Security) policies for multi-tenant support
-- Note: Enable RLS on the table if using with tenant isolation
-- ALTER TABLE qr_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for admin access (service role can access all)
-- CREATE POLICY "Service role has full access" ON qr_verification_sessions
--     FOR ALL
--     USING (true)
--     WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE qr_verification_sessions IS 'Stores QR-based verification session data for B2B customer flows (VFS Global, etc.)';
COMMENT ON COLUMN qr_verification_sessions.session_id IS 'Human-readable unique session identifier (e.g., QR-ABC123-XYZ789)';
COMMENT ON COLUMN qr_verification_sessions.token_hash IS 'SHA-256 hash of the one-time verification token';
COMMENT ON COLUMN qr_verification_sessions.customer_id IS 'B2B customer identifier (e.g., vfs-global, customer-xyz)';
COMMENT ON COLUMN qr_verification_sessions.customer_name IS 'Display name of the B2B customer';
COMMENT ON COLUMN qr_verification_sessions.journey_id IS 'Uqudo journey configuration ID';
COMMENT ON COLUMN qr_verification_sessions.reference_id IS 'Customer reference ID (application number, visa ID, etc.)';
COMMENT ON COLUMN qr_verification_sessions.status IS 'Session status: pending (created), initialized (scanned), completed (verified), failed, expired';
COMMENT ON COLUMN qr_verification_sessions.device_info IS 'Device information captured from mobile app';
COMMENT ON COLUMN qr_verification_sessions.verification_result IS 'Verification result data (JWS payload, scores, etc.)';

-- Function to auto-expire old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_qr_sessions()
RETURNS void AS $$
BEGIN
    UPDATE qr_verification_sessions
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired sessions
-- (Requires pg_cron extension)
-- SELECT cron.schedule('cleanup-qr-sessions', '*/5 * * * *', 'SELECT cleanup_expired_qr_sessions()');
