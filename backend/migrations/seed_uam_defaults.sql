-- Migration: Seed default permissions and roles for UAM
-- Run this AFTER create_uam_tables.sql
-- Replace 'YOUR_TENANT_ID' with your actual tenant UUID

-- =====================================================
-- HELPER: Create a function to seed defaults for a tenant
-- =====================================================
CREATE OR REPLACE FUNCTION seed_uam_defaults(p_tenant_id UUID, p_admin_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_super_admin_role_id UUID;
  v_compliance_role_id UUID;
  v_fraud_reviewer_role_id UUID;
  v_manager_role_id UUID;
  v_view_only_role_id UUID;
BEGIN

  -- =====================================================
  -- 1. INSERT DEFAULT PERMISSIONS
  -- =====================================================

  -- Dashboard Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'dashboard.view', 'View Dashboard', 'Access to view the main dashboard', 'dashboard', 'dashboard', 'view', 'page', true, 1)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Accounts Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'accounts.view', 'View Accounts', 'Access to view customer accounts', 'accounts', 'accounts', 'view', 'page', true, 10),
    (p_tenant_id, 'accounts.create', 'Create Accounts', 'Create new customer accounts', 'accounts', 'accounts', 'create', 'action', true, 11),
    (p_tenant_id, 'accounts.edit', 'Edit Accounts', 'Edit existing customer accounts', 'accounts', 'accounts', 'edit', 'action', true, 12),
    (p_tenant_id, 'accounts.delete', 'Delete Accounts', 'Delete customer accounts', 'accounts', 'accounts', 'delete', 'action', true, 13),
    (p_tenant_id, 'accounts.export', 'Export Accounts', 'Export customer account data', 'accounts', 'accounts', 'export', 'action', true, 14),
    (p_tenant_id, 'accounts.view_pii', 'View PII Data', 'View personally identifiable information', 'accounts', 'accounts', 'view_pii', 'action', true, 15)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- KYC Alerts Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'alerts.view', 'View Alerts', 'Access to view KYC alerts', 'alerts', 'alerts', 'view', 'page', true, 20),
    (p_tenant_id, 'alerts.create', 'Create Alerts', 'Create new KYC alerts manually', 'alerts', 'alerts', 'create', 'action', true, 21),
    (p_tenant_id, 'alerts.edit', 'Edit Alerts', 'Edit existing alerts', 'alerts', 'alerts', 'edit', 'action', true, 22),
    (p_tenant_id, 'alerts.resolve', 'Resolve Alerts', 'Mark alerts as resolved', 'alerts', 'alerts', 'resolve', 'action', true, 23),
    (p_tenant_id, 'alerts.escalate', 'Escalate Alerts', 'Escalate alerts to higher level', 'alerts', 'alerts', 'escalate', 'action', true, 24),
    (p_tenant_id, 'alerts.assign', 'Assign Alerts', 'Assign alerts to team members', 'alerts', 'alerts', 'assign', 'action', true, 25)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- AML Cases Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'cases.view', 'View Cases', 'Access to view AML cases', 'cases', 'cases', 'view', 'page', true, 30),
    (p_tenant_id, 'cases.create', 'Create Cases', 'Create new AML cases', 'cases', 'cases', 'create', 'action', true, 31),
    (p_tenant_id, 'cases.edit', 'Edit Cases', 'Edit existing cases', 'cases', 'cases', 'edit', 'action', true, 32),
    (p_tenant_id, 'cases.approve', 'Approve Cases', 'Approve and close cases', 'cases', 'cases', 'approve', 'action', true, 33),
    (p_tenant_id, 'cases.reject', 'Reject Cases', 'Reject cases with reason', 'cases', 'cases', 'reject', 'action', true, 34),
    (p_tenant_id, 'cases.escalate', 'Escalate Cases', 'Escalate cases to MLRO', 'cases', 'cases', 'escalate', 'action', true, 35),
    (p_tenant_id, 'cases.assign', 'Assign Cases', 'Assign cases to team members', 'cases', 'cases', 'assign', 'action', true, 36),
    (p_tenant_id, 'cases.export', 'Export Cases', 'Export case data and reports', 'cases', 'cases', 'export', 'action', true, 37)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Analytics Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'analytics.view', 'View Analytics', 'Access to view analytics dashboard', 'analytics', 'analytics', 'view', 'page', true, 40),
    (p_tenant_id, 'analytics.export', 'Export Analytics', 'Export analytics reports', 'analytics', 'analytics', 'export', 'action', true, 41),
    (p_tenant_id, 'analytics.configure', 'Configure Analytics', 'Configure analytics settings', 'analytics', 'analytics', 'configure', 'action', true, 42)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Blocklist Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'blocklist.view', 'View Blocklist', 'Access to view blocklist', 'blocklist', 'blocklist', 'view', 'page', true, 50),
    (p_tenant_id, 'blocklist.create', 'Add to Blocklist', 'Add entries to blocklist', 'blocklist', 'blocklist', 'create', 'action', true, 51),
    (p_tenant_id, 'blocklist.edit', 'Edit Blocklist', 'Edit blocklist entries', 'blocklist', 'blocklist', 'edit', 'action', true, 52),
    (p_tenant_id, 'blocklist.delete', 'Remove from Blocklist', 'Remove entries from blocklist', 'blocklist', 'blocklist', 'delete', 'action', true, 53),
    (p_tenant_id, 'blocklist.import', 'Import Blocklist', 'Bulk import blocklist entries', 'blocklist', 'blocklist', 'import', 'action', true, 54)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- KYC Setup/Configuration Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'kyc_setup.view', 'View KYC Setup', 'Access to view KYC configuration', 'settings', 'kyc_setup', 'view', 'page', true, 60),
    (p_tenant_id, 'kyc_setup.edit', 'Edit KYC Setup', 'Modify KYC configuration settings', 'settings', 'kyc_setup', 'edit', 'action', true, 61)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- User Management Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'users.view', 'View Users', 'Access to view user list', 'admin', 'users', 'view', 'page', true, 70),
    (p_tenant_id, 'users.create', 'Create Users', 'Create new user accounts', 'admin', 'users', 'create', 'action', true, 71),
    (p_tenant_id, 'users.edit', 'Edit Users', 'Edit user accounts', 'admin', 'users', 'edit', 'action', true, 72),
    (p_tenant_id, 'users.delete', 'Delete Users', 'Delete user accounts', 'admin', 'users', 'delete', 'action', true, 73),
    (p_tenant_id, 'users.assign_roles', 'Assign Roles', 'Assign roles to users', 'admin', 'users', 'assign_roles', 'action', true, 74),
    (p_tenant_id, 'users.reset_password', 'Reset Password', 'Reset user passwords', 'admin', 'users', 'reset_password', 'action', true, 75)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Roles Management Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'roles.view', 'View Roles', 'Access to view roles', 'admin', 'roles', 'view', 'page', true, 80),
    (p_tenant_id, 'roles.create', 'Create Roles', 'Create new roles', 'admin', 'roles', 'create', 'action', true, 81),
    (p_tenant_id, 'roles.edit', 'Edit Roles', 'Edit existing roles', 'admin', 'roles', 'edit', 'action', true, 82),
    (p_tenant_id, 'roles.delete', 'Delete Roles', 'Delete roles', 'admin', 'roles', 'delete', 'action', true, 83),
    (p_tenant_id, 'roles.assign_permissions', 'Assign Permissions', 'Assign permissions to roles', 'admin', 'roles', 'assign_permissions', 'action', true, 84)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Security Settings Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'security.view', 'View Security Settings', 'Access to view security settings', 'admin', 'security', 'view', 'page', true, 90),
    (p_tenant_id, 'security.edit', 'Edit Security Settings', 'Modify security settings', 'admin', 'security', 'edit', 'action', true, 91),
    (p_tenant_id, 'sso.configure', 'Configure SSO', 'Configure SSO providers', 'admin', 'sso', 'configure', 'action', true, 92),
    (p_tenant_id, 'sso.test', 'Test SSO', 'Test SSO connections', 'admin', 'sso', 'test', 'action', true, 93)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Audit Log Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'audit.view', 'View Audit Logs', 'Access to view audit logs', 'admin', 'audit', 'view', 'page', true, 100),
    (p_tenant_id, 'audit.export', 'Export Audit Logs', 'Export audit log data', 'admin', 'audit', 'export', 'action', true, 101)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Reports Permissions
  INSERT INTO permissions (tenant_id, code, name, description, category, resource, action, permission_type, is_system, display_order)
  VALUES
    (p_tenant_id, 'reports.view', 'View Reports', 'Access to view reports', 'reports', 'reports', 'view', 'page', true, 110),
    (p_tenant_id, 'reports.create', 'Create Reports', 'Generate custom reports', 'reports', 'reports', 'create', 'action', true, 111),
    (p_tenant_id, 'reports.export', 'Export Reports', 'Export report data', 'reports', 'reports', 'export', 'action', true, 112),
    (p_tenant_id, 'reports.schedule', 'Schedule Reports', 'Schedule automated reports', 'reports', 'reports', 'schedule', 'action', true, 113)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- =====================================================
  -- 2. INSERT DEFAULT ROLES
  -- =====================================================

  -- Super Admin Role
  INSERT INTO roles (tenant_id, code, name, description, is_system, is_default, priority, color, icon, created_by)
  VALUES (
    p_tenant_id,
    'super_admin',
    'Super Admin',
    'Full access to all pages, actions, settings, and configurations. Can manage users, roles, permissions, and SSO settings.',
    true,
    false,
    100,
    '#dc3545',
    'admin_panel_settings',
    p_admin_user_id
  )
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_super_admin_role_id;

  -- Compliance User Role
  INSERT INTO roles (tenant_id, code, name, description, is_system, is_default, priority, color, icon, created_by)
  VALUES (
    p_tenant_id,
    'compliance_user',
    'Compliance User',
    'View KYC cases, reports, and audit logs. Limited actions with no system configuration access.',
    true,
    false,
    40,
    '#17a2b8',
    'policy',
    p_admin_user_id
  )
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_compliance_role_id;

  -- Fraud Reviewer Role
  INSERT INTO roles (tenant_id, code, name, description, is_system, is_default, priority, color, icon, created_by)
  VALUES (
    p_tenant_id,
    'fraud_reviewer',
    'Fraud Reviewer',
    'Review, approve, reject, and escalate fraud/KYC cases. No access to admin or security settings.',
    true,
    false,
    50,
    '#fd7e14',
    'security',
    p_admin_user_id
  )
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_fraud_reviewer_role_id;

  -- Manager Role
  INSERT INTO roles (tenant_id, code, name, description, is_system, is_default, priority, color, icon, created_by)
  VALUES (
    p_tenant_id,
    'manager',
    'Manager',
    'View dashboards, reports, and team performance. Approve or override decisions within assigned scope.',
    true,
    false,
    60,
    '#6f42c1',
    'supervisor_account',
    p_admin_user_id
  )
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_manager_role_id;

  -- View Only Role
  INSERT INTO roles (tenant_id, code, name, description, is_system, is_default, priority, color, icon, created_by)
  VALUES (
    p_tenant_id,
    'view_only',
    'View Only',
    'Read-only access to view data without any modification capabilities.',
    true,
    true,
    10,
    '#6c757d',
    'visibility',
    p_admin_user_id
  )
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_view_only_role_id;

  -- =====================================================
  -- 3. ASSIGN PERMISSIONS TO ROLES
  -- =====================================================

  -- Super Admin: All permissions
  INSERT INTO role_permissions (tenant_id, role_id, permission_id, grant_type, granted_by)
  SELECT p_tenant_id, v_super_admin_role_id, id, 'allow', p_admin_user_id
  FROM permissions
  WHERE tenant_id = p_tenant_id
  ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;

  -- Compliance User: View access to accounts, alerts, cases, analytics, reports, audit logs
  INSERT INTO role_permissions (tenant_id, role_id, permission_id, grant_type, granted_by)
  SELECT p_tenant_id, v_compliance_role_id, id, 'allow', p_admin_user_id
  FROM permissions
  WHERE tenant_id = p_tenant_id
    AND code IN (
      'dashboard.view',
      'accounts.view',
      'alerts.view',
      'cases.view',
      'analytics.view',
      'reports.view',
      'reports.export',
      'audit.view',
      'audit.export'
    )
  ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;

  -- Fraud Reviewer: Review and action on alerts and cases
  INSERT INTO role_permissions (tenant_id, role_id, permission_id, grant_type, granted_by)
  SELECT p_tenant_id, v_fraud_reviewer_role_id, id, 'allow', p_admin_user_id
  FROM permissions
  WHERE tenant_id = p_tenant_id
    AND code IN (
      'dashboard.view',
      'accounts.view',
      'accounts.view_pii',
      'alerts.view',
      'alerts.edit',
      'alerts.resolve',
      'alerts.escalate',
      'cases.view',
      'cases.edit',
      'cases.approve',
      'cases.reject',
      'cases.escalate',
      'analytics.view',
      'blocklist.view',
      'reports.view'
    )
  ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;

  -- Manager: Dashboard, reports, team oversight, approve/override
  INSERT INTO role_permissions (tenant_id, role_id, permission_id, grant_type, granted_by)
  SELECT p_tenant_id, v_manager_role_id, id, 'allow', p_admin_user_id
  FROM permissions
  WHERE tenant_id = p_tenant_id
    AND code IN (
      'dashboard.view',
      'accounts.view',
      'accounts.view_pii',
      'accounts.export',
      'alerts.view',
      'alerts.edit',
      'alerts.resolve',
      'alerts.escalate',
      'alerts.assign',
      'cases.view',
      'cases.edit',
      'cases.approve',
      'cases.reject',
      'cases.escalate',
      'cases.assign',
      'cases.export',
      'analytics.view',
      'analytics.export',
      'blocklist.view',
      'reports.view',
      'reports.create',
      'reports.export',
      'reports.schedule',
      'users.view'
    )
  ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;

  -- View Only: Read-only access to main features
  INSERT INTO role_permissions (tenant_id, role_id, permission_id, grant_type, granted_by)
  SELECT p_tenant_id, v_view_only_role_id, id, 'allow', p_admin_user_id
  FROM permissions
  WHERE tenant_id = p_tenant_id
    AND code IN (
      'dashboard.view',
      'accounts.view',
      'alerts.view',
      'cases.view',
      'analytics.view',
      'reports.view'
    )
  ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;

  RAISE NOTICE 'UAM defaults seeded successfully for tenant %', p_tenant_id;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLE:
-- =====================================================
-- SELECT seed_uam_defaults('your-tenant-uuid-here', 'admin-user-uuid-here');
-- Or without admin user:
-- SELECT seed_uam_defaults('your-tenant-uuid-here');

-- =====================================================
-- PERMISSION MATRIX REFERENCE
-- =====================================================
/*
+------------------+-------------+------------+----------------+---------+-----------+
| Permission       | Super Admin | Compliance | Fraud Reviewer | Manager | View Only |
+------------------+-------------+------------+----------------+---------+-----------+
| DASHBOARD        |             |            |                |         |           |
| dashboard.view   |     ✓       |     ✓      |       ✓        |    ✓    |     ✓     |
+------------------+-------------+------------+----------------+---------+-----------+
| ACCOUNTS         |             |            |                |         |           |
| accounts.view    |     ✓       |     ✓      |       ✓        |    ✓    |     ✓     |
| accounts.create  |     ✓       |            |                |         |           |
| accounts.edit    |     ✓       |            |                |         |           |
| accounts.delete  |     ✓       |            |                |         |           |
| accounts.export  |     ✓       |            |                |    ✓    |           |
| accounts.view_pii|     ✓       |            |       ✓        |    ✓    |           |
+------------------+-------------+------------+----------------+---------+-----------+
| ALERTS           |             |            |                |         |           |
| alerts.view      |     ✓       |     ✓      |       ✓        |    ✓    |     ✓     |
| alerts.create    |     ✓       |            |                |         |           |
| alerts.edit      |     ✓       |            |       ✓        |    ✓    |           |
| alerts.resolve   |     ✓       |            |       ✓        |    ✓    |           |
| alerts.escalate  |     ✓       |            |       ✓        |    ✓    |           |
| alerts.assign    |     ✓       |            |                |    ✓    |           |
+------------------+-------------+------------+----------------+---------+-----------+
| CASES            |             |            |                |         |           |
| cases.view       |     ✓       |     ✓      |       ✓        |    ✓    |     ✓     |
| cases.create     |     ✓       |            |                |         |           |
| cases.edit       |     ✓       |            |       ✓        |    ✓    |           |
| cases.approve    |     ✓       |            |       ✓        |    ✓    |           |
| cases.reject     |     ✓       |            |       ✓        |    ✓    |           |
| cases.escalate   |     ✓       |            |       ✓        |    ✓    |           |
| cases.assign     |     ✓       |            |                |    ✓    |           |
| cases.export     |     ✓       |            |                |    ✓    |           |
+------------------+-------------+------------+----------------+---------+-----------+
| ANALYTICS        |             |            |                |         |           |
| analytics.view   |     ✓       |     ✓      |       ✓        |    ✓    |     ✓     |
| analytics.export |     ✓       |            |                |    ✓    |           |
| analytics.config |     ✓       |            |                |         |           |
+------------------+-------------+------------+----------------+---------+-----------+
| BLOCKLIST        |             |            |                |         |           |
| blocklist.view   |     ✓       |            |       ✓        |    ✓    |           |
| blocklist.create |     ✓       |            |                |         |           |
| blocklist.edit   |     ✓       |            |                |         |           |
| blocklist.delete |     ✓       |            |                |         |           |
| blocklist.import |     ✓       |            |                |         |           |
+------------------+-------------+------------+----------------+---------+-----------+
| KYC SETUP        |             |            |                |         |           |
| kyc_setup.view   |     ✓       |            |                |         |           |
| kyc_setup.edit   |     ✓       |            |                |         |           |
+------------------+-------------+------------+----------------+---------+-----------+
| USERS            |             |            |                |         |           |
| users.view       |     ✓       |            |                |    ✓    |           |
| users.create     |     ✓       |            |                |         |           |
| users.edit       |     ✓       |            |                |         |           |
| users.delete     |     ✓       |            |                |         |           |
| users.assign_role|     ✓       |            |                |         |           |
| users.reset_pwd  |     ✓       |            |                |         |           |
+------------------+-------------+------------+----------------+---------+-----------+
| ROLES            |             |            |                |         |           |
| roles.view       |     ✓       |            |                |         |           |
| roles.create     |     ✓       |            |                |         |           |
| roles.edit       |     ✓       |            |                |         |           |
| roles.delete     |     ✓       |            |                |         |           |
| roles.assign_perm|     ✓       |            |                |         |           |
+------------------+-------------+------------+----------------+---------+-----------+
| SECURITY         |             |            |                |         |           |
| security.view    |     ✓       |            |                |         |           |
| security.edit    |     ✓       |            |                |         |           |
| sso.configure    |     ✓       |            |                |         |           |
| sso.test         |     ✓       |            |                |         |           |
+------------------+-------------+------------+----------------+---------+-----------+
| AUDIT            |             |            |                |         |           |
| audit.view       |     ✓       |     ✓      |                |         |           |
| audit.export     |     ✓       |     ✓      |                |         |           |
+------------------+-------------+------------+----------------+---------+-----------+
| REPORTS          |             |            |                |         |           |
| reports.view     |     ✓       |     ✓      |       ✓        |    ✓    |     ✓     |
| reports.create   |     ✓       |            |                |    ✓    |           |
| reports.export   |     ✓       |     ✓      |                |    ✓    |           |
| reports.schedule |     ✓       |            |                |    ✓    |           |
+------------------+-------------+------------+----------------+---------+-----------+
*/
