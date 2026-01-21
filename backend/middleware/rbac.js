import { supabaseAdmin } from '../config/supabase.js';

/**
 * Permission cache to avoid repeated database lookups
 * TTL: 5 minutes
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get user's effective permissions from database
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Set<string>>} Set of permission codes
 */
async function getUserPermissions(userId, tenantId) {
  const cacheKey = `${userId}:${tenantId}`;
  const cached = permissionCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  // Get user's roles
  const { data: userRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  const roleIds = (userRoles || []).map(ur => ur.role_id);

  if (roleIds.length === 0) {
    const emptySet = new Set();
    permissionCache.set(cacheKey, { permissions: emptySet, timestamp: Date.now() });
    return emptySet;
  }

  // Get permissions for all roles
  const { data: rolePermissions } = await supabaseAdmin
    .from('role_permissions')
    .select(`
      grant_type,
      permissions (code)
    `)
    .eq('tenant_id', tenantId)
    .in('role_id', roleIds);

  // Build permission set (handle allow/deny)
  const allowedPermissions = new Set();
  const deniedPermissions = new Set();

  (rolePermissions || []).forEach(rp => {
    const code = rp.permissions?.code;
    if (!code) return;

    if (rp.grant_type === 'deny') {
      deniedPermissions.add(code);
    } else {
      allowedPermissions.add(code);
    }
  });

  // Remove denied permissions from allowed
  deniedPermissions.forEach(p => allowedPermissions.delete(p));

  // Cache the result
  permissionCache.set(cacheKey, {
    permissions: allowedPermissions,
    timestamp: Date.now()
  });

  return allowedPermissions;
}

/**
 * Clear permission cache for a user
 * Called when user roles are updated
 */
export function clearPermissionCache(userId, tenantId) {
  if (userId && tenantId) {
    permissionCache.delete(`${userId}:${tenantId}`);
  } else if (tenantId) {
    // Clear all entries for tenant
    for (const key of permissionCache.keys()) {
      if (key.endsWith(`:${tenantId}`)) {
        permissionCache.delete(key);
      }
    }
  } else {
    // Clear entire cache
    permissionCache.clear();
  }
}

/**
 * Authorization middleware - checks if user has required permission
 * @param {string} requiredPermission - Permission code required (e.g., 'accounts.view')
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
export function authorizePermission(requiredPermission, options = {}) {
  const { allowSuperAdmin = true } = options;

  return async (req, res, next) => {
    try {
      const { id: userId, tenantId, role } = req.user;

      // Super admin bypass (if legacy role field is used)
      if (allowSuperAdmin && role === 'mlro') {
        return next();
      }

      // Get user's permissions
      const permissions = await getUserPermissions(userId, tenantId);

      // Check if user has the required permission
      if (!permissions.has(requiredPermission)) {
        // Check for wildcard permission (e.g., 'accounts.*' for 'accounts.view')
        const [resource] = requiredPermission.split('.');
        if (!permissions.has(`${resource}.*`) && !permissions.has('*')) {
          return res.status(403).json({
            success: false,
            error: `Access denied. Required permission: ${requiredPermission}`
          });
        }
      }

      // Attach permissions to request for later use
      req.userPermissions = permissions;

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Check multiple permissions (ANY - at least one must be present)
 * @param {string[]} requiredPermissions - Array of permission codes
 * @returns {Function} Express middleware
 */
export function authorizeAnyPermission(requiredPermissions) {
  return async (req, res, next) => {
    try {
      const { id: userId, tenantId, role } = req.user;

      // Super admin bypass
      if (role === 'mlro') {
        return next();
      }

      const permissions = await getUserPermissions(userId, tenantId);

      const hasAny = requiredPermissions.some(p => permissions.has(p));

      if (!hasAny) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required one of: ${requiredPermissions.join(', ')}`
        });
      }

      req.userPermissions = permissions;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Check multiple permissions (ALL - all must be present)
 * @param {string[]} requiredPermissions - Array of permission codes
 * @returns {Function} Express middleware
 */
export function authorizeAllPermissions(requiredPermissions) {
  return async (req, res, next) => {
    try {
      const { id: userId, tenantId, role } = req.user;

      // Super admin bypass
      if (role === 'mlro') {
        return next();
      }

      const permissions = await getUserPermissions(userId, tenantId);

      const missingPermissions = requiredPermissions.filter(p => !permissions.has(p));

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Missing permissions: ${missingPermissions.join(', ')}`
        });
      }

      req.userPermissions = permissions;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Check if user has a specific role
 * @param {string[]} allowedRoles - Array of role codes
 * @returns {Function} Express middleware
 */
export function authorizeRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const { id: userId, tenantId } = req.user;

      // Get user's roles
      const { data: userRoles } = await supabaseAdmin
        .from('user_roles')
        .select(`
          roles (code)
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      const userRoleCodes = (userRoles || []).map(ur => ur.roles?.code).filter(Boolean);

      const hasRole = allowedRoles.some(r => userRoleCodes.includes(r));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      req.userRoles = userRoleCodes;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Helper: Check permission in request handler
 * Use when you need conditional logic based on permissions
 * @param {Object} req - Express request (must have userPermissions attached)
 * @param {string} permission - Permission code to check
 * @returns {boolean}
 */
export function hasPermission(req, permission) {
  if (!req.userPermissions) {
    return false;
  }
  return req.userPermissions.has(permission);
}

/**
 * Middleware to load permissions without blocking
 * Useful when you want to check permissions in the handler
 */
export async function loadPermissions(req, res, next) {
  try {
    const { id: userId, tenantId } = req.user;
    req.userPermissions = await getUserPermissions(userId, tenantId);
    next();
  } catch (error) {
    console.error('Error loading permissions:', error);
    req.userPermissions = new Set();
    next();
  }
}

export default {
  authorizePermission,
  authorizeAnyPermission,
  authorizeAllPermissions,
  authorizeRole,
  hasPermission,
  loadPermissions,
  clearPermissionCache
};
