import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*, tenants(id, name, domain, status)')
      .eq('id', decoded.userId)
      .eq('status', 'active')
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if tenant is active
    if (user.tenants.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Tenant account is not active'
      });
    }

    // Attach user and tenant info to request
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      permissions: user.permissions || [],
      department: user.department,
      tenantId: user.tenant_id,
      tenant: user.tenants
    };

    // Set tenant context for RLS
    process.env.CURRENT_TENANT_ID = user.tenant_id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Authorization middleware - checks user role and permissions
 * @param {Array} allowedRoles - Array of roles allowed to access the route
 * @param {String} permission - Optional specific permission required
 */
export const authorize = (allowedRoles = [], permission = null) => {
  return (req, res, next) => {
    const { role, permissions } = req.user;

    // Check role-based access
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions - role not allowed'
      });
    }

    // Check specific permission if provided
    if (permission && !permissions.includes(permission) && role !== 'mlro') {
      return res.status(403).json({
        success: false,
        error: `Missing required permission: ${permission}`
      });
    }

    next();
  };
};

/**
 * Tenant isolation middleware - ensures user can only access their tenant's data
 */
export const ensureTenantIsolation = (req, res, next) => {
  const tenantIdFromParams = req.params.tenantId || req.query.tenantId || req.body.tenantId;

  if (tenantIdFromParams && tenantIdFromParams !== req.user.tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - tenant mismatch'
    });
  }

  next();
};

/**
 * View-only restriction - prevents modifications for view-only users
 */
export const preventViewOnlyModifications = (req, res, next) => {
  if (req.user.role === 'view_only' && req.method !== 'GET') {
    return res.status(403).json({
      success: false,
      error: 'View-only users cannot perform modifications'
    });
  }

  next();
};

export default { authenticate, authorize, ensureTenantIsolation, preventViewOnlyModifications };
