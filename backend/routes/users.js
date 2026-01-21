import express from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorizePermission } from '../middleware/rbac.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get list of users with filtering and pagination
 * @access  Private - requires users.view permission
 */
router.get('/', authorizePermission('users.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    department,
    sort = 'created_at',
    order = 'desc'
  } = req.query;

  // Build query
  let query = supabaseAdmin
    .from('users')
    .select(`
      id,
      email,
      full_name,
      role,
      department,
      status,
      last_login,
      created_at,
      updated_at
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  if (role) {
    query = query.eq('role', role);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (department) {
    query = query.eq('department', department);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  // Get role assignments for each user
  const userIds = data.map(u => u.id);
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select(`
      user_id,
      is_primary,
      roles (
        id,
        code,
        name,
        color,
        icon
      )
    `)
    .eq('tenant_id', tenantId)
    .in('user_id', userIds);

  // Map roles to users
  const usersWithRoles = data.map(user => ({
    ...user,
    roles: (userRoles || [])
      .filter(ur => ur.user_id === user.id)
      .map(ur => ({
        ...ur.roles,
        isPrimary: ur.is_primary
      }))
  }));

  res.json({
    success: true,
    data: usersWithRoles,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}));

/**
 * @route   GET /api/users/:id
 * @desc    Get user details by ID
 * @access  Private - requires users.view permission
 */
router.get('/:id', authorizePermission('users.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      email,
      full_name,
      role,
      department,
      status,
      permissions,
      last_login,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Get user's role assignments
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select(`
      id,
      is_primary,
      assigned_at,
      expires_at,
      roles (
        id,
        code,
        name,
        description,
        color,
        icon
      )
    `)
    .eq('user_id', id)
    .eq('tenant_id', tenantId);

  // Get user's effective permissions (from all roles)
  const roleIds = (userRoles || []).map(ur => ur.roles.id);
  let effectivePermissions = [];

  if (roleIds.length > 0) {
    const { data: rolePerms } = await supabaseAdmin
      .from('role_permissions')
      .select(`
        permissions (
          code,
          name,
          category,
          action
        )
      `)
      .eq('tenant_id', tenantId)
      .in('role_id', roleIds)
      .eq('grant_type', 'allow');

    effectivePermissions = [...new Set(
      (rolePerms || []).map(rp => rp.permissions.code)
    )];
  }

  res.json({
    success: true,
    data: {
      ...user,
      roles: (userRoles || []).map(ur => ({
        ...ur.roles,
        isPrimary: ur.is_primary,
        assignedAt: ur.assigned_at,
        expiresAt: ur.expires_at
      })),
      effectivePermissions
    }
  });
}));

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private - requires users.create permission
 */
router.post('/', authorizePermission('users.create'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const {
    email,
    fullName,
    password,
    role = 'view_only',
    department,
    roleIds = []
  } = req.body;

  // Validate required fields
  if (!email || !fullName || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email, full name, and password are required'
    });
  }

  // Check if email already exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('tenant_id', tenantId)
    .single();

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'A user with this email already exists'
    });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      tenant_id: tenantId,
      email: email.toLowerCase(),
      full_name: fullName,
      password_hash: passwordHash,
      role: role,
      department: department,
      status: 'active',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  // Assign roles if provided
  if (roleIds.length > 0) {
    const roleAssignments = roleIds.map((roleId, index) => ({
      tenant_id: tenantId,
      user_id: newUser.id,
      role_id: roleId,
      is_primary: index === 0,
      assigned_by: currentUserId
    }));

    await supabaseAdmin
      .from('user_roles')
      .insert(roleAssignments);
  } else {
    // Assign default role if no roles specified
    const { data: defaultRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .single();

    if (defaultRole) {
      await supabaseAdmin
        .from('user_roles')
        .insert({
          tenant_id: tenantId,
          user_id: newUser.id,
          role_id: defaultRole.id,
          is_primary: true,
          assigned_by: currentUserId
        });
    }
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'user',
      entity_id: newUser.id,
      action: 'create',
      new_values: { email: newUser.email, fullName: newUser.full_name, role: newUser.role },
      performed_by: currentUserId
    });

  res.status(201).json({
    success: true,
    data: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      department: newUser.department,
      status: newUser.status
    },
    message: 'User created successfully'
  });
}));

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user details
 * @access  Private - requires users.edit permission
 */
router.patch('/:id', authorizePermission('users.edit'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id } = req.params;
  const {
    fullName,
    role,
    department,
    status
  } = req.body;

  // Get current user data for audit
  const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !existingUser) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Build update object
  const updates = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (role !== undefined) updates.role = role;
  if (department !== undefined) updates.department = department;
  if (status !== undefined) updates.status = status;
  updates.updated_at = new Date().toISOString();

  const { data: updatedUser, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'user',
      entity_id: id,
      action: 'update',
      old_values: { fullName: existingUser.full_name, role: existingUser.role, department: existingUser.department, status: existingUser.status },
      new_values: updates,
      performed_by: currentUserId
    });

  res.json({
    success: true,
    data: updatedUser,
    message: 'User updated successfully'
  });
}));

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete (deactivate) a user
 * @access  Private - requires users.delete permission
 */
router.delete('/:id', authorizePermission('users.delete'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id } = req.params;

  // Prevent self-deletion
  if (id === currentUserId) {
    return res.status(400).json({
      success: false,
      error: 'You cannot delete your own account'
    });
  }

  // Soft delete by setting status to 'deleted'
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'user',
      entity_id: id,
      action: 'delete',
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

/**
 * @route   POST /api/users/:id/roles
 * @desc    Assign roles to a user
 * @access  Private - requires users.assign_roles permission
 */
router.post('/:id/roles', authorizePermission('users.assign_roles'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id: userId } = req.params;
  const { roleIds, primaryRoleId } = req.body;

  if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one role ID is required'
    });
  }

  // Verify user exists
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Verify all roles exist and belong to tenant
  const { data: roles } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', roleIds);

  if (!roles || roles.length !== roleIds.length) {
    return res.status(400).json({
      success: false,
      error: 'One or more invalid role IDs'
    });
  }

  // Get current roles for audit
  const { data: currentRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);

  // Remove existing role assignments
  await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);

  // Create new role assignments
  const primary = primaryRoleId || roleIds[0];
  const roleAssignments = roleIds.map(roleId => ({
    tenant_id: tenantId,
    user_id: userId,
    role_id: roleId,
    is_primary: roleId === primary,
    assigned_by: currentUserId
  }));

  const { error } = await supabaseAdmin
    .from('user_roles')
    .insert(roleAssignments);

  if (error) {
    console.error('Error assigning roles:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'user_role',
      entity_id: userId,
      action: 'update',
      old_values: { roleIds: currentRoles?.map(r => r.role_id) },
      new_values: { roleIds, primaryRoleId: primary },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'Roles assigned successfully'
  });
}));

/**
 * @route   GET /api/users/me/preferences
 * @desc    Get current user's preferences (theme, etc.)
 * @access  Private
 */
router.get('/me/preferences', asyncHandler(async (req, res) => {
  const { tenantId, id: userId } = req.user;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }

  res.json({
    success: true,
    data: user?.preferences || {
      theme_preference: 'system',
      notifications_enabled: true,
      language: 'en'
    }
  });
}));

/**
 * @route   PATCH /api/users/me/preferences
 * @desc    Update current user's preferences
 * @access  Private
 */
router.patch('/me/preferences', asyncHandler(async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const {
    theme_preference,
    notifications_enabled,
    language
  } = req.body;

  // Get current preferences
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('preferences')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();

  const currentPrefs = user?.preferences || {};

  // Merge with new preferences
  const updatedPrefs = {
    ...currentPrefs,
    ...(theme_preference !== undefined && { theme_preference }),
    ...(notifications_enabled !== undefined && { notifications_enabled }),
    ...(language !== undefined && { language })
  };

  // Validate theme_preference
  if (theme_preference && !['light', 'dark', 'system'].includes(theme_preference)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid theme preference. Must be "light", "dark", or "system".'
    });
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      preferences: updatedPrefs,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }

  res.json({
    success: true,
    data: updatedPrefs,
    message: 'Preferences updated successfully'
  });
}));

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (admin action)
 * @access  Private - requires users.reset_password permission
 */
router.post('/:id/reset-password', authorizePermission('users.reset_password'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id: userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters'
    });
  }

  // Verify user exists
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error resetting password:', error);
    throw error;
  }

  // Log the action (without the actual password)
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'user',
      entity_id: userId,
      action: 'reset_password',
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

export default router;
