import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorizePermission } from '../middleware/rbac.js';

const router = express.Router();

/**
 * @route   GET /api/roles
 * @desc    Get list of all roles
 * @access  Private - requires roles.view permission
 */
router.get('/', authorizePermission('roles.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { includePermissions = 'false', includeUserCount = 'false' } = req.query;

  let query = supabaseAdmin
    .from('roles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: false });

  const { data: roles, error } = await query;

  if (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }

  let result = roles || [];

  // Optionally include permissions for each role
  if (includePermissions === 'true') {
    const roleIds = result.map(r => r.id);
    const { data: rolePerms } = await supabaseAdmin
      .from('role_permissions')
      .select(`
        role_id,
        grant_type,
        conditions,
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

    result = result.map(role => ({
      ...role,
      permissions: (rolePerms || [])
        .filter(rp => rp.role_id === role.id)
        .map(rp => ({
          ...rp.permissions,
          grantType: rp.grant_type,
          conditions: rp.conditions
        }))
    }));
  }

  // Optionally include user count for each role
  if (includeUserCount === 'true') {
    const { data: userCounts } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('tenant_id', tenantId);

    const countMap = {};
    (userCounts || []).forEach(ur => {
      countMap[ur.role_id] = (countMap[ur.role_id] || 0) + 1;
    });

    result = result.map(role => ({
      ...role,
      userCount: countMap[role.id] || 0
    }));
  }

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/roles/:id
 * @desc    Get role details with permissions
 * @access  Private - requires roles.view permission
 */
router.get('/:id', authorizePermission('roles.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data: role, error } = await supabaseAdmin
    .from('roles')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !role) {
    return res.status(404).json({
      success: false,
      error: 'Role not found'
    });
  }

  // Get role permissions
  const { data: rolePerms } = await supabaseAdmin
    .from('role_permissions')
    .select(`
      id,
      grant_type,
      conditions,
      permissions (
        id,
        code,
        name,
        description,
        category,
        resource,
        action,
        permission_type
      )
    `)
    .eq('role_id', id)
    .eq('tenant_id', tenantId);

  // Get users with this role
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select(`
      users (
        id,
        email,
        full_name,
        status
      )
    `)
    .eq('role_id', id)
    .eq('tenant_id', tenantId);

  res.json({
    success: true,
    data: {
      ...role,
      permissions: (rolePerms || []).map(rp => ({
        ...rp.permissions,
        grantType: rp.grant_type,
        conditions: rp.conditions
      })),
      users: (userRoles || []).map(ur => ur.users).filter(Boolean)
    }
  });
}));

/**
 * @route   POST /api/roles
 * @desc    Create a new role
 * @access  Private - requires roles.create permission
 */
router.post('/', authorizePermission('roles.create'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const {
    code,
    name,
    description,
    color = '#6c757d',
    icon = 'person',
    priority = 0,
    isDefault = false,
    permissionIds = []
  } = req.body;

  // Validate required fields
  if (!code || !name) {
    return res.status(400).json({
      success: false,
      error: 'Role code and name are required'
    });
  }

  // Check for duplicate code
  const { data: existingRole } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('code', code.toLowerCase().replace(/\s+/g, '_'))
    .eq('tenant_id', tenantId)
    .single();

  if (existingRole) {
    return res.status(409).json({
      success: false,
      error: 'A role with this code already exists'
    });
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    await supabaseAdmin
      .from('roles')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
      .eq('is_default', true);
  }

  // Create role
  const { data: newRole, error } = await supabaseAdmin
    .from('roles')
    .insert({
      tenant_id: tenantId,
      code: code.toLowerCase().replace(/\s+/g, '_'),
      name,
      description,
      color,
      icon,
      priority,
      is_default: isDefault,
      is_system: false,
      created_by: currentUserId
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating role:', error);
    throw error;
  }

  // Assign permissions if provided
  if (permissionIds.length > 0) {
    const permissionAssignments = permissionIds.map(permId => ({
      tenant_id: tenantId,
      role_id: newRole.id,
      permission_id: permId,
      grant_type: 'allow',
      granted_by: currentUserId
    }));

    await supabaseAdmin
      .from('role_permissions')
      .insert(permissionAssignments);
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'role',
      entity_id: newRole.id,
      action: 'create',
      new_values: { code: newRole.code, name: newRole.name, permissionCount: permissionIds.length },
      performed_by: currentUserId
    });

  res.status(201).json({
    success: true,
    data: newRole,
    message: 'Role created successfully'
  });
}));

/**
 * @route   PATCH /api/roles/:id
 * @desc    Update role details
 * @access  Private - requires roles.edit permission
 */
router.patch('/:id', authorizePermission('roles.edit'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id } = req.params;
  const {
    name,
    description,
    color,
    icon,
    priority,
    isDefault
  } = req.body;

  // Get current role data
  const { data: existingRole, error: fetchError } = await supabaseAdmin
    .from('roles')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !existingRole) {
    return res.status(404).json({
      success: false,
      error: 'Role not found'
    });
  }

  // System roles have limited editability
  if (existingRole.is_system) {
    // Only allow updating name, description, color, icon for system roles
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    updates.updated_at = new Date().toISOString();

    const { data: updatedRole, error } = await supabaseAdmin
      .from('roles')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data: updatedRole,
      message: 'System role updated (limited fields)'
    });
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    await supabaseAdmin
      .from('roles')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
      .eq('is_default', true);
  }

  // Build update object
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (color !== undefined) updates.color = color;
  if (icon !== undefined) updates.icon = icon;
  if (priority !== undefined) updates.priority = priority;
  if (isDefault !== undefined) updates.is_default = isDefault;
  updates.updated_at = new Date().toISOString();

  const { data: updatedRole, error } = await supabaseAdmin
    .from('roles')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating role:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'role',
      entity_id: id,
      action: 'update',
      old_values: existingRole,
      new_values: updates,
      performed_by: currentUserId
    });

  res.json({
    success: true,
    data: updatedRole,
    message: 'Role updated successfully'
  });
}));

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete a role
 * @access  Private - requires roles.delete permission
 */
router.delete('/:id', authorizePermission('roles.delete'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id } = req.params;

  // Get role info
  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!role) {
    return res.status(404).json({
      success: false,
      error: 'Role not found'
    });
  }

  // Prevent deletion of system roles
  if (role.is_system) {
    return res.status(403).json({
      success: false,
      error: 'System roles cannot be deleted'
    });
  }

  // Check if role is assigned to any users
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('id')
    .eq('role_id', id)
    .eq('tenant_id', tenantId)
    .limit(1);

  if (userRoles && userRoles.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete role that is assigned to users. Please reassign users first.'
    });
  }

  // Delete role permissions first
  await supabaseAdmin
    .from('role_permissions')
    .delete()
    .eq('role_id', id)
    .eq('tenant_id', tenantId);

  // Delete the role
  const { error } = await supabaseAdmin
    .from('roles')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting role:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'role',
      entity_id: id,
      action: 'delete',
      old_values: { code: role.code, name: role.name },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'Role deleted successfully'
  });
}));

/**
 * @route   PUT /api/roles/:id/permissions
 * @desc    Update role permissions (replace all)
 * @access  Private - requires roles.assign_permissions permission
 */
router.put('/:id/permissions', authorizePermission('roles.assign_permissions'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id: roleId } = req.params;
  const { permissionIds = [] } = req.body;

  // Verify role exists
  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('id, code, name')
    .eq('id', roleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!role) {
    return res.status(404).json({
      success: false,
      error: 'Role not found'
    });
  }

  // Get current permissions for audit
  const { data: currentPerms } = await supabaseAdmin
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', roleId)
    .eq('tenant_id', tenantId);

  // Delete existing permissions
  await supabaseAdmin
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('tenant_id', tenantId);

  // Insert new permissions
  if (permissionIds.length > 0) {
    const permissionAssignments = permissionIds.map(permId => ({
      tenant_id: tenantId,
      role_id: roleId,
      permission_id: permId,
      grant_type: 'allow',
      granted_by: currentUserId
    }));

    const { error } = await supabaseAdmin
      .from('role_permissions')
      .insert(permissionAssignments);

    if (error) {
      console.error('Error assigning permissions:', error);
      throw error;
    }
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'role_permission',
      entity_id: roleId,
      action: 'update',
      old_values: { permissionIds: currentPerms?.map(p => p.permission_id) },
      new_values: { permissionIds },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'Role permissions updated successfully'
  });
}));

/**
 * @route   POST /api/roles/:id/permissions
 * @desc    Add specific permissions to a role
 * @access  Private - requires roles.assign_permissions permission
 */
router.post('/:id/permissions', authorizePermission('roles.assign_permissions'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id: roleId } = req.params;
  const { permissionIds = [] } = req.body;

  if (!permissionIds.length) {
    return res.status(400).json({
      success: false,
      error: 'At least one permission ID is required'
    });
  }

  // Verify role exists
  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('id', roleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!role) {
    return res.status(404).json({
      success: false,
      error: 'Role not found'
    });
  }

  // Insert permissions (ignore conflicts)
  const permissionAssignments = permissionIds.map(permId => ({
    tenant_id: tenantId,
    role_id: roleId,
    permission_id: permId,
    grant_type: 'allow',
    granted_by: currentUserId
  }));

  const { error } = await supabaseAdmin
    .from('role_permissions')
    .upsert(permissionAssignments, { onConflict: 'tenant_id,role_id,permission_id' });

  if (error) {
    console.error('Error adding permissions:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'role_permission',
      entity_id: roleId,
      action: 'grant',
      new_values: { permissionIds },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'Permissions added successfully'
  });
}));

/**
 * @route   DELETE /api/roles/:id/permissions
 * @desc    Remove specific permissions from a role
 * @access  Private - requires roles.assign_permissions permission
 */
router.delete('/:id/permissions', authorizePermission('roles.assign_permissions'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id: roleId } = req.params;
  const { permissionIds = [] } = req.body;

  if (!permissionIds.length) {
    return res.status(400).json({
      success: false,
      error: 'At least one permission ID is required'
    });
  }

  const { error } = await supabaseAdmin
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('tenant_id', tenantId)
    .in('permission_id', permissionIds);

  if (error) {
    console.error('Error removing permissions:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'role_permission',
      entity_id: roleId,
      action: 'revoke',
      old_values: { permissionIds },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'Permissions removed successfully'
  });
}));

export default router;
