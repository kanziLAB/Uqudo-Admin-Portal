-- Migration: Create sdk_trace_events table for real-time trace storage
-- Date: 2026-01-19
-- Description: Dedicated table for storing individual SDK trace events
--              Enables real-time analytics, querying, and event history

-- =====================================================
-- SDK Trace Events Table
-- Stores individual trace events from Web and Mobile SDKs
-- =====================================================

CREATE TABLE IF NOT EXISTS sdk_trace_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

    -- Session identifiers
    session_id VARCHAR(255) NOT NULL, -- SDK session ID
    device_identifier VARCHAR(255), -- Device unique identifier
    jti VARCHAR(255), -- JWT ID from SDK source

    -- Event data (matches Web SDK trace format)
    event_name VARCHAR(100) NOT NULL, -- VIEW, START, IN_PROGRESS, COMPLETE, FINISH, etc.
    event_type VARCHAR(100), -- category: ENROLLMENT, SCAN, FACE, etc.
    event_status VARCHAR(50), -- SUCCESS, FAILURE, IN_PROGRESS
    status_code VARCHAR(255), -- FACE_MULTIPLE_FACES_DETECTED, FACE_BLUR_DETECTED, etc.
    status_message TEXT, -- Human-readable status message

    -- Context
    page VARCHAR(100), -- SCAN, FACE, READ, etc.
    document_type VARCHAR(100), -- UAE_ID, PASSPORT, GENERIC_ID, etc.

    -- Timing
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER DEFAULT 0, -- Duration in milliseconds

    -- SDK metadata
    sdk_type VARCHAR(50), -- WEB, ANDROID, IOS
    sdk_version VARCHAR(50),
    device_platform VARCHAR(100), -- Chrome, Safari, Android, iOS
    device_model VARCHAR(255),

    -- Raw event data (for any additional fields)
    raw_event JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for fast querying
-- =====================================================

-- Index on session_id for grouping events by session
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_session_id
ON sdk_trace_events(session_id);

-- Index on account_id for linking to accounts
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_account_id
ON sdk_trace_events(account_id);

-- Index on tenant_id for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_tenant_id
ON sdk_trace_events(tenant_id);

-- Index on event_timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_timestamp
ON sdk_trace_events(event_timestamp DESC);

-- Index on event_name for filtering by event type
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_event_name
ON sdk_trace_events(event_name);

-- Index on status_code for filtering failures/issues
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_status_code
ON sdk_trace_events(status_code) WHERE status_code IS NOT NULL;

-- Composite index for common queries (session events by time)
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_session_time
ON sdk_trace_events(session_id, event_timestamp);

-- Composite index for tenant + time range queries
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_tenant_time
ON sdk_trace_events(tenant_id, event_timestamp DESC);

-- GIN index on raw_event for JSONB queries
CREATE INDEX IF NOT EXISTS idx_sdk_trace_events_raw_event
ON sdk_trace_events USING GIN (raw_event);

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE sdk_trace_events IS 'Individual SDK trace events from Web and Mobile SDKs for real-time analytics';
COMMENT ON COLUMN sdk_trace_events.session_id IS 'Unique session identifier from SDK (sessionId field)';
COMMENT ON COLUMN sdk_trace_events.device_identifier IS 'Device unique identifier for tracking across sessions';
COMMENT ON COLUMN sdk_trace_events.event_name IS 'Event name: VIEW, START, IN_PROGRESS, COMPLETE, FINISH, etc.';
COMMENT ON COLUMN sdk_trace_events.event_type IS 'Event category: ENROLLMENT, SCAN, FACE, READ, etc.';
COMMENT ON COLUMN sdk_trace_events.status_code IS 'SDK status code: FACE_MULTIPLE_FACES_DETECTED, FACE_BLUR_DETECTED, etc.';
COMMENT ON COLUMN sdk_trace_events.duration_ms IS 'Event duration in milliseconds';
COMMENT ON COLUMN sdk_trace_events.raw_event IS 'Complete raw event data as received from SDK';

-- =====================================================
-- Sample query examples (for documentation)
-- =====================================================

-- Get all events for a session:
-- SELECT * FROM sdk_trace_events WHERE session_id = 'xxx' ORDER BY event_timestamp;

-- Get failure events in last 24 hours:
-- SELECT * FROM sdk_trace_events
-- WHERE event_status = 'FAILURE'
-- AND event_timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY event_timestamp DESC;

-- Get events by status code:
-- SELECT * FROM sdk_trace_events
-- WHERE status_code = 'FACE_MULTIPLE_FACES_DETECTED'
-- ORDER BY event_timestamp DESC;

-- Count events by type for a tenant:
-- SELECT event_name, COUNT(*)
-- FROM sdk_trace_events
-- WHERE tenant_id = 'xxx'
-- GROUP BY event_name;
