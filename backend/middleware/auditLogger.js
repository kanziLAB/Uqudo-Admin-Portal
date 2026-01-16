import { supabaseAdmin } from '../config/supabase.js';

/**
 * Audit logging middleware - logs all API actions
 */
export const auditLogger = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture response
  res.json = function(data) {
    // Only log if user is authenticated and it's a modification
    if (req.user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // Log asynchronously to avoid blocking response
      logAudit(req, res, data).catch(err => {
        console.error('Audit logging failed:', err);
      });
    }

    // Call original json method
    return originalJson(data);
  };

  next();
};

/**
 * Log audit entry to database
 */
async function logAudit(req, res, responseData) {
  try {
    const { user } = req;

    // Determine entity type and ID from path
    const pathParts = req.path.split('/').filter(Boolean);
    const entityType = pathParts[1] || null; // e.g., 'accounts', 'alerts', 'cases'
    const entityId = pathParts[2] && pathParts[2].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      ? pathParts[2]
      : null;

    // Determine action
    let action = `${req.method} ${req.path}`;
    if (req.method === 'POST') action = `CREATE ${entityType}`;
    if (req.method === 'PUT' || req.method === 'PATCH') action = `UPDATE ${entityType}`;
    if (req.method === 'DELETE') action = `DELETE ${entityType}`;

    // Prepare audit log entry
    const auditEntry = {
      tenant_id: user.tenantId,
      user_id: user.id,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: req.method !== 'POST' ? req.body : null,
      new_values: responseData?.data || null,
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    };

    // Insert audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert(auditEntry);

  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error - audit logging should not break the request
  }
}

export default auditLogger;
