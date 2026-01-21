-- Migration: Create User Access Management (UAM) tables
-- Run this migration in Supabase SQL Editor

-- =====================================================
-- 1. PERMISSIONS TABLE
-- Defines all available permissions in the system
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Permission identification
  code TEXT NOT NULL,                    -- e.g., 'accounts.view', 'cases.approve'
  name TEXT NOT NULL,                    -- Human-readable name
  description TEXT,                      -- Detailed description

  -- Permission categorization
  category TEXT NOT NULL,                -- e.g., 'accounts', 'cases', 'settings'
  resource TEXT NOT NULL,                -- The resource being protected
  action TEXT NOT NULL,                  -- view, create, edit, delete, approve, reject, export

  -- Permission type
  permission_type TEXT DEFAULT 'action', -- 'page' for page access, 'action' for specific actions

  -- Metadata
  is_system BOOLEAN DEFAULT false,       -- System permissions can't be deleted
  display_order INT DEFAULT 0,           -- For UI ordering

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);

-- =====================================================
-- 2. ROLES TABLE
-- Defines roles that can be assigned to users
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Role identification
  code TEXT NOT NULL,                    -- e.g., 'super_admin', 'compliance_user'
  name TEXT NOT NULL,                    -- Human-readable name
  description TEXT,                      -- Role description

  -- Role configuration
  is_system BOOLEAN DEFAULT false,       -- System roles can't be deleted
  is_default BOOLEAN DEFAULT false,      -- Default role for new users
  priority INT DEFAULT 0,                -- Higher priority roles override lower

  -- Visual
  color TEXT DEFAULT '#6c757d',          -- Badge color
  icon TEXT DEFAULT 'person',            -- Material icon name

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, code)
);

-- =====================================================
-- 3. ROLE_PERMISSIONS TABLE
-- Maps roles to their permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  -- Permission grant type
  grant_type TEXT DEFAULT 'allow',       -- 'allow' or 'deny' for explicit denials

  -- Conditions (for conditional permissions)
  conditions JSONB,                      -- e.g., {"department": "fraud"}, {"own_records": true}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, role_id, permission_id)
);

-- =====================================================
-- 4. USER_ROLES TABLE
-- Maps users to roles (supports multiple roles per user)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- Role assignment metadata
  is_primary BOOLEAN DEFAULT false,      -- Primary role for the user
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,                -- Optional role expiration

  UNIQUE(tenant_id, user_id, role_id)
);

-- =====================================================
-- 5. SSO_PROVIDERS TABLE
-- Stores SSO provider configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Provider identification
  provider_type TEXT NOT NULL,           -- 'google', 'azure_ad', 'okta', 'saml', 'oidc'
  name TEXT NOT NULL,                    -- Display name

  -- Provider configuration
  is_enabled BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,      -- Primary SSO for this tenant

  -- OAuth/OIDC Configuration
  client_id TEXT,
  client_secret TEXT,                    -- Encrypted in production
  tenant_id_azure TEXT,                  -- For Azure AD
  discovery_url TEXT,                    -- OIDC discovery URL
  authorization_url TEXT,
  token_url TEXT,
  userinfo_url TEXT,
  jwks_uri TEXT,

  -- SAML Configuration
  entity_id TEXT,
  sso_url TEXT,
  slo_url TEXT,
  certificate TEXT,

  -- Redirect URIs
  redirect_uri TEXT,
  post_logout_redirect_uri TEXT,

  -- Scopes and claims
  scopes TEXT[] DEFAULT ARRAY['openid', 'email', 'profile'],
  claim_mappings JSONB,                  -- Map SSO claims to user fields

  -- Role mapping
  default_role_id UUID REFERENCES roles(id),
  role_mappings JSONB,                   -- Map SSO groups to roles

  -- Security settings
  enforce_sso_only BOOLEAN DEFAULT false,-- Disable password login when enabled
  auto_provision_users BOOLEAN DEFAULT true,
  auto_update_user_info BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  last_used_at TIMESTAMPTZ,

  UNIQUE(tenant_id, provider_type)
);

-- =====================================================
-- 6. SSO_SESSIONS TABLE
-- Tracks SSO authentication sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,

  -- Session data
  sso_user_id TEXT,                      -- User ID from SSO provider
  access_token TEXT,                     -- Encrypted
  refresh_token TEXT,                    -- Encrypted
  id_token TEXT,

  -- Session metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

-- =====================================================
-- 7. PERMISSION_AUDIT_LOG TABLE
-- Tracks all permission changes for compliance
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- What changed
  entity_type TEXT NOT NULL,             -- 'role', 'permission', 'user_role', 'sso_provider'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,                  -- 'create', 'update', 'delete', 'grant', 'revoke'

  -- Change details
  old_values JSONB,
  new_values JSONB,

  -- Who made the change
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Additional context
  reason TEXT,                           -- Optional reason for the change
  approval_id UUID                       -- Reference to approval workflow if required
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_permissions_tenant_id ON permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant_id ON role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_sso_providers_tenant_id ON sso_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sso_providers_enabled ON sso_providers(tenant_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_provider_id ON sso_sessions(provider_id);

CREATE INDEX IF NOT EXISTS idx_permission_audit_log_tenant_id ON permission_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_entity ON permission_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_performed_at ON permission_audit_log(performed_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for permissions table
CREATE POLICY "Users can view own tenant permissions" ON permissions
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Admins can manage permissions" ON permissions
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policies for roles table
CREATE POLICY "Users can view own tenant roles" ON roles
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policies for role_permissions table
CREATE POLICY "Users can view own tenant role_permissions" ON role_permissions
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Admins can manage role_permissions" ON role_permissions
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policies for user_roles table
CREATE POLICY "Users can view own tenant user_roles" ON user_roles
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Admins can manage user_roles" ON user_roles
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policies for sso_providers table
CREATE POLICY "Users can view own tenant sso_providers" ON sso_providers
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Admins can manage sso_providers" ON sso_providers
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policies for sso_sessions table
CREATE POLICY "Users can view own sso_sessions" ON sso_sessions
  FOR SELECT USING (user_id = (auth.jwt() ->> 'user_id')::uuid);

-- Policies for permission_audit_log table
CREATE POLICY "Users can view own tenant audit_log" ON permission_audit_log
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE permissions IS 'Defines all available permissions (pages and actions) in the system';
COMMENT ON TABLE roles IS 'Defines configurable roles that can be assigned to users';
COMMENT ON TABLE role_permissions IS 'Maps roles to permissions with optional conditions';
COMMENT ON TABLE user_roles IS 'Maps users to roles, supporting multiple roles per user';
COMMENT ON TABLE sso_providers IS 'Stores SSO provider configurations (Google, Azure AD, Okta, etc.)';
COMMENT ON TABLE sso_sessions IS 'Tracks active SSO authentication sessions';
COMMENT ON TABLE permission_audit_log IS 'Audit trail for all permission-related changes';
