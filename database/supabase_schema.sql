-- =====================================================
-- Uqudo Admin Portal - Supabase Database Schema (MVP1)
-- Multi-Tenant AML/KYC Management System
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TENANTS & USERS
-- =====================================================

-- Tenants table (Organizations/Clients)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255),
    config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table with RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL, -- analyst, team_lead, manager, mlro, view_only
    permissions JSONB DEFAULT '[]',
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- =====================================================
-- 2. ACCOUNTS & KYC
-- =====================================================

-- Customer Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- External user ID from SDK

    -- Personal Information
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    name_verified VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(20),
    nationality VARCHAR(100),

    -- ID Information
    id_type VARCHAR(50), -- passport, eid, driving_license, visa, pan_card
    id_number VARCHAR(255),
    issuing_place VARCHAR(255),
    expiry_date DATE,
    unique_doc_id VARCHAR(255),

    -- Contact & Address
    address TEXT,
    province_emirate VARCHAR(100),
    country_of_residence VARCHAR(100),
    phone_number VARCHAR(50),
    email VARCHAR(255),

    -- Account Status
    account_status VARCHAR(50) DEFAULT 'active', -- active, suspended, blocked
    kyc_verification_status VARCHAR(50) DEFAULT 'unverified', -- verified, unverified, manual_review, failed
    pep_sanctions_status VARCHAR(50) DEFAULT 'pending', -- pending, unsolved, in_process, clear, positive

    -- Verification Channel
    verification_channel VARCHAR(50), -- government_db, ocr
    verification_type VARCHAR(50), -- uae, international

    -- Duplicate Detection
    duplicate_account_id UUID REFERENCES accounts(id),
    duplicity_rule_id UUID,

    -- Terms & Conditions
    tc_version VARCHAR(50),
    tc_accepted_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    last_verification_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, user_id)
);

-- Verification Tickets
CREATE TABLE verification_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    ticket_id VARCHAR(255) NOT NULL,

    -- Ticket Details
    id_type VARCHAR(50),
    id_number VARCHAR(255),
    workflow_name VARCHAR(255),
    workflow_version VARCHAR(50),

    -- Results
    result VARCHAR(50), -- pass, fail
    status VARCHAR(50), -- finished, processing, failed
    reason TEXT,

    -- Verification Details
    verification_method VARCHAR(50), -- govdb_api, ocr, manual
    number_of_attempts INT DEFAULT 1,
    threshold_score DECIMAL(5,2),
    similarity_score DECIMAL(5,2),
    api_code VARCHAR(50),
    api_return_message TEXT,

    -- API Return Data
    api_return_data JSONB,
    user_submitted_data JSONB,
    ocr_extracted_data JSONB,

    -- Images (for OCR)
    front_image_url TEXT,
    back_image_url TEXT,

    -- Timestamps
    created_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_time TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 3. ALERTS & CASES
-- =====================================================

-- KYC Alerts
CREATE TABLE kyc_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    alert_type VARCHAR(50) NOT NULL, -- manual_review, duplicate_account, id_expiry
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical

    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,

    -- Resolution
    resolution VARCHAR(50), -- approved, declined, false_positive
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AML Cases
CREATE TABLE aml_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    case_id VARCHAR(255) NOT NULL UNIQUE,

    -- Case Details
    match_count INT DEFAULT 0,
    resolution_status VARCHAR(50) DEFAULT 'unsolved', -- unsolved, false, positive

    -- External AML Portal Link
    external_case_url TEXT,

    -- Assignment
    action_by UUID REFERENCES users(id),

    -- Timestamps
    last_updated_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. DOCUMENTS
-- =====================================================

-- Document Uploads
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Document Info
    document_type VARCHAR(100), -- identity_document, proof_of_address, bank_letter, etc.
    document_name VARCHAR(255),
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    file_format VARCHAR(10),

    -- Extracted Information
    extracted_data JSONB,

    -- Compliance Review
    compliance_status VARCHAR(50) DEFAULT 'pending', -- pending, compliant, non_compliant
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,

    -- Request Information
    requested_by UUID REFERENCES users(id),
    request_message TEXT,
    request_expiry TIMESTAMP WITH TIME ZONE,

    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Requests
CREATE TABLE document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Request Details
    document_types TEXT[], -- Array of requested document types
    notification_channels TEXT[], -- email, customer_account, customer_inbox
    message TEXT,
    expiry_time TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, fulfilled, expired

    -- Request Info
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 5. ANALYST LOGS & NOTES
-- =====================================================

-- Analyst Activity Log
CREATE TABLE analyst_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES kyc_alerts(id) ON DELETE CASCADE,
    case_id UUID REFERENCES aml_cases(id) ON DELETE CASCADE,

    -- Action Details
    action VARCHAR(100) NOT NULL, -- document_request, kyc_status_update, note_added, etc.
    description TEXT,

    -- User Info
    user_id UUID NOT NULL REFERENCES users(id),
    department VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

    -- Note Content
    description TEXT NOT NULL,
    attachment_url TEXT,

    -- User Info
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. CONFIGURATION
-- =====================================================

-- KYC Setup Configuration
CREATE TABLE kyc_setup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- EID Verification
    eid_verification_enabled BOOLEAN DEFAULT true,
    fuzzy_name_threshold_min INT DEFAULT 0,
    fuzzy_name_threshold_max INT DEFAULT 100,
    allowed_retry_attempts INT DEFAULT 3,

    -- OCR Configuration
    ocr_enabled BOOLEAN DEFAULT true,
    uae_applicant_ocr_limit INT DEFAULT 1,
    international_applicant_ocr_limit INT DEFAULT 3,
    identity_document_upload_enabled BOOLEAN DEFAULT true,

    -- Grace Period
    grace_period_enabled BOOLEAN DEFAULT true,
    grace_period_days INT DEFAULT 90,

    -- Metadata
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id)
);

-- Blocklist
CREATE TABLE blocklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Individual Information
    name VARCHAR(255),
    nationality VARCHAR(100),
    date_of_birth DATE,
    id_type VARCHAR(50) NOT NULL,
    id_number VARCHAR(255) NOT NULL,

    -- Metadata
    last_updated_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, id_type, id_number)
);

-- Rule Categories
CREATE TABLE rule_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

-- Rules Engine
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_id VARCHAR(50) UNIQUE NOT NULL,

    -- Rule Details
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES rule_categories(id),

    -- Rule Logic
    parameter_type VARCHAR(50), -- compare, data_match
    rule_logic JSONB NOT NULL, -- Stores the condition tree

    -- Actions
    trigger_alert BOOLEAN DEFAULT true,
    suspend_account BOOLEAN DEFAULT false,

    -- Status
    status BOOLEAN DEFAULT true, -- enabled/disabled

    -- Related Accounts Count
    related_accounts_count INT DEFAULT 0,

    -- Metadata
    created_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Country Configuration
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Country Info
    country_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    region VARCHAR(100),

    -- Configuration
    status BOOLEAN DEFAULT true, -- enabled/disabled
    remark TEXT,

    -- Metadata
    last_modified_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, country_code)
);

-- =====================================================
-- 7. AUDIT & COMPLIANCE
-- =====================================================

-- Comprehensive Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Action Details
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100), -- account, alert, case, config, etc.
    entity_id UUID,

    -- Change Tracking
    old_values JSONB,
    new_values JSONB,

    -- Request Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Biometric Data (for display in alerts)
CREATE TABLE biometric_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    verification_ticket_id UUID REFERENCES verification_tickets(id),

    -- Liveness Check
    liveness_check_passed BOOLEAN,
    liveness_score DECIMAL(5,2),

    -- Face Matching
    face_match_score DECIMAL(5,2),
    face_match_passed BOOLEAN,

    -- Document Authentication
    document_authentic BOOLEAN,
    document_auth_score DECIMAL(5,2),

    -- OCR vs Submitted Comparison
    data_match_percentage DECIMAL(5,2),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Attestation Data
CREATE TABLE device_attestation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Device Information
    device_id VARCHAR(255),
    device_type VARCHAR(50), -- mobile, tablet, desktop
    os_type VARCHAR(50),
    os_version VARCHAR(50),

    -- Network & Location
    ip_address INET,
    geolocation JSONB, -- {country, city, lat, lon}

    -- Risk Assessment
    risk_score DECIMAL(5,2),
    browser_fingerprint TEXT,

    -- Session Info
    session_id VARCHAR(255),
    session_start TIMESTAMP WITH TIME ZONE,
    session_end TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

-- Accounts
CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_kyc_status ON accounts(kyc_verification_status);
CREATE INDEX idx_accounts_account_status ON accounts(account_status);
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_id_number ON accounts(id_number);

-- Verification Tickets
CREATE INDEX idx_verification_tickets_account_id ON verification_tickets(account_id);
CREATE INDEX idx_verification_tickets_tenant_id ON verification_tickets(tenant_id);
CREATE INDEX idx_verification_tickets_result ON verification_tickets(result);

-- KYC Alerts
CREATE INDEX idx_kyc_alerts_tenant_id ON kyc_alerts(tenant_id);
CREATE INDEX idx_kyc_alerts_account_id ON kyc_alerts(account_id);
CREATE INDEX idx_kyc_alerts_status ON kyc_alerts(status);
CREATE INDEX idx_kyc_alerts_assigned_to ON kyc_alerts(assigned_to);

-- AML Cases
CREATE INDEX idx_aml_cases_tenant_id ON aml_cases(tenant_id);
CREATE INDEX idx_aml_cases_account_id ON aml_cases(account_id);
CREATE INDEX idx_aml_cases_resolution_status ON aml_cases(resolution_status);

-- Analyst Logs
CREATE INDEX idx_analyst_logs_account_id ON analyst_logs(account_id);
CREATE INDEX idx_analyst_logs_user_id ON analyst_logs(user_id);
CREATE INDEX idx_analyst_logs_created_at ON analyst_logs(created_at);

-- Audit Logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_attestation ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (applies to most tables)
CREATE POLICY tenant_isolation_policy ON accounts
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON verification_tickets
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON kyc_alerts
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON aml_cases
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON documents
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON document_requests
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON analyst_logs
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON notes
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON blocklist
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON rules
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- 10. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_alerts_updated_at BEFORE UPDATE ON kyc_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. SEED DATA (Sample tenant and admin user)
-- =====================================================

-- Insert default tenant
INSERT INTO tenants (id, name, domain, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Uqudo Demo Tenant', 'demo.uqudo.com', 'active');

-- Insert admin user
INSERT INTO users (tenant_id, email, full_name, role, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@uqudo.com', 'Admin User', 'mlro', 'active');

-- Insert default rule category
INSERT INTO rule_categories (tenant_id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Account Duplicity', 'Rules for detecting duplicate accounts');

-- Insert default KYC setup
INSERT INTO kyc_setup (tenant_id) VALUES
    ('00000000-0000-0000-0000-000000000001');

-- =====================================================
-- END OF SCHEMA
-- =====================================================
