import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorizePermission } from '../middleware/rbac.js';

const router = express.Router();

/**
 * @route   GET /api/permissions
 * @desc    Get list of all permissions (grouped by category)
 * @access  Private - requires roles.view permission (to view permission matrix)
 */
router.get('/', authorizePermission('roles.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { category, permissionType, grouped = 'true' } = req.query;

  let query = supabaseAdmin
    .from('permissions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  if (permissionType) {
    query = query.eq('permission_type', permissionType);
  }

  const { data: permissions, error } = await query;

  if (error) {
    console.error('Error fetching permissions:', error);
    throw error;
  }

  // Group by category if requested
  if (grouped === 'true') {
    const groupedPermissions = {};
    (permissions || []).forEach(perm => {
      if (!groupedPermissions[perm.category]) {
        groupedPermissions[perm.category] = {
          category: perm.category,
          displayName: formatCategoryName(perm.category),
          permissions: []
        };
      }
      groupedPermissions[perm.category].permissions.push(perm);
    });

    // Convert to array and sort by category
    const categoryOrder = ['dashboard', 'accounts', 'alerts', 'cases', 'analytics', 'blocklist', 'reports', 'settings', 'admin'];
    const result = Object.values(groupedPermissions).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return res.json({
      success: true,
      data: result
    });
  }

  res.json({
    success: true,
    data: permissions || []
  });
}));

/**
 * @route   GET /api/permissions/matrix
 * @desc    Get permission matrix (roles vs permissions)
 * @access  Private - requires roles.view permission
 */
router.get('/matrix', authorizePermission('roles.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;

  // Get all roles
  const { data: roles } = await supabaseAdmin
    .from('roles')
    .select('id, code, name, color, is_system, priority')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: false });

  // Get all permissions
  const { data: permissions } = await supabaseAdmin
    .from('permissions')
    .select('id, code, name, category, resource, action, permission_type')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true });

  // Get role-permission mappings
  const { data: rolePermissions } = await supabaseAdmin
    .from('role_permissions')
    .select('role_id, permission_id, grant_type')
    .eq('tenant_id', tenantId);

  // Build matrix
  const matrix = {};
  (rolePermissions || []).forEach(rp => {
    if (!matrix[rp.role_id]) {
      matrix[rp.role_id] = {};
    }
    matrix[rp.role_id][rp.permission_id] = rp.grant_type;
  });

  // Group permissions by category
  const groupedPermissions = {};
  (permissions || []).forEach(perm => {
    if (!groupedPermissions[perm.category]) {
      groupedPermissions[perm.category] = [];
    }
    groupedPermissions[perm.category].push(perm);
  });

  res.json({
    success: true,
    data: {
      roles: roles || [],
      permissionsByCategory: groupedPermissions,
      matrix
    }
  });
}));

/**
 * @route   GET /api/permissions/my
 * @desc    Get current user's effective permissions
 * @access  Private
 */
router.get('/my', asyncHandler(async (req, res) => {
  const { tenantId, id: userId } = req.user;

  // Get user's roles
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select(`
      role_id,
      is_primary,
      roles (
        id,
        code,
        name,
        priority
      )
    `)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);

  const roleIds = (userRoles || []).map(ur => ur.role_id);

  if (roleIds.length === 0) {
    return res.json({
      success: true,
      data: {
        roles: [],
        permissions: [],
        permissionCodes: []
      }
    });
  }

  // Get permissions for all user's roles
  const { data: rolePermissions } = await supabaseAdmin
    .from('role_permissions')
    .select(`
      grant_type,
      permissions (
        id,
        code,
        name,
        category,
        resource,
        action,
        permission_type
      )
    `)
    .eq('tenant_id', tenantId)
    .in('role_id', roleIds);

  // Collect unique permissions (allow takes precedence, then check for deny)
  const permissionMap = {};
  (rolePermissions || []).forEach(rp => {
    const code = rp.permissions.code;
    if (!permissionMap[code] || rp.grant_type === 'allow') {
      permissionMap[code] = {
        ...rp.permissions,
        granted: rp.grant_type === 'allow'
      };
    }
  });

  // Filter to only allowed permissions
  const effectivePermissions = Object.values(permissionMap).filter(p => p.granted);
  const permissionCodes = effectivePermissions.map(p => p.code);

  res.json({
    success: true,
    data: {
      roles: (userRoles || []).map(ur => ({
        ...ur.roles,
        isPrimary: ur.is_primary
      })),
      permissions: effectivePermissions,
      permissionCodes
    }
  });
}));

/**
 * @route   POST /api/permissions
 * @desc    Create a new custom permission
 * @access  Private - requires roles.assign_permissions permission (super admin)
 */
router.post('/', authorizePermission('roles.assign_permissions'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const {
    code,
    name,
    description,
    category,
    resource,
    action,
    permissionType = 'action'
  } = req.body;

  // Validate required fields
  if (!code || !name || !category || !resource || !action) {
    return res.status(400).json({
      success: false,
      error: 'Code, name, category, resource, and action are required'
    });
  }

  // Check for duplicate code
  const { data: existingPerm } = await supabaseAdmin
    .from('permissions')
    .select('id')
    .eq('code', code)
    .eq('tenant_id', tenantId)
    .single();

  if (existingPerm) {
    return res.status(409).json({
      success: false,
      error: 'A permission with this code already exists'
    });
  }

  // Get max display order in category
  const { data: maxOrder } = await supabaseAdmin
    .from('permissions')
    .select('display_order')
    .eq('tenant_id', tenantId)
    .eq('category', category)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const { data: newPermission, error } = await supabaseAdmin
    .from('permissions')
    .insert({
      tenant_id: tenantId,
      code,
      name,
      description,
      category,
      resource,
      action,
      permission_type: permissionType,
      is_system: false,
      display_order: (maxOrder?.display_order || 0) + 1
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating permission:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'permission',
      entity_id: newPermission.id,
      action: 'create',
      new_values: { code, name, category },
      performed_by: currentUserId
    });

  res.status(201).json({
    success: true,
    data: newPermission,
    message: 'Permission created successfully'
  });
}));

/**
 * @route   DELETE /api/permissions/:id
 * @desc    Delete a custom permission
 * @access  Private - requires roles.assign_permissions permission (super admin)
 */
router.delete('/:id', authorizePermission('roles.assign_permissions'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id } = req.params;

  // Get permission info
  const { data: permission } = await supabaseAdmin
    .from('permissions')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!permission) {
    return res.status(404).json({
      success: false,
      error: 'Permission not found'
    });
  }

  // Prevent deletion of system permissions
  if (permission.is_system) {
    return res.status(403).json({
      success: false,
      error: 'System permissions cannot be deleted'
    });
  }

  // Delete role-permission associations first
  await supabaseAdmin
    .from('role_permissions')
    .delete()
    .eq('permission_id', id)
    .eq('tenant_id', tenantId);

  // Delete the permission
  const { error } = await supabaseAdmin
    .from('permissions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting permission:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'permission',
      entity_id: id,
      action: 'delete',
      old_values: { code: permission.code, name: permission.name },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'Permission deleted successfully'
  });
}));

/**
 * Helper: Format category name for display
 */
function formatCategoryName(category) {
  const names = {
    dashboard: 'Dashboard',
    accounts: 'Accounts',
    alerts: 'KYC Alerts',
    cases: 'AML Cases',
    analytics: 'Analytics',
    blocklist: 'Blocklist',
    settings: 'Settings',
    admin: 'Administration',
    reports: 'Reports'
  };
  return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

export default router;
