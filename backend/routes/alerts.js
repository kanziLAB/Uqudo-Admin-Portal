import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorize, preventViewOnlyModifications } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/alerts
 * @desc    Get list of KYC alerts with filtering and pagination
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    verificationChannel,
    verificationType,
    accountStatus,
    alertType,
    status,
    search
  } = req.query;

  // Build query
  let query = supabaseAdmin
    .from('kyc_alerts')
    .select(`
      *,
      accounts (
        user_id,
        first_name,
        last_name,
        email,
        verification_channel,
        verification_type,
        account_status
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate);
  }

  if (alertType) {
    query = query.eq('alert_type', alertType);
  }

  if (status) {
    query = query.eq('status', status);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Additional filtering by account fields
  let filteredData = data;

  if (verificationChannel) {
    filteredData = filteredData.filter(alert =>
      alert.accounts?.verification_channel === verificationChannel
    );
  }

  if (verificationType) {
    filteredData = filteredData.filter(alert =>
      alert.accounts?.verification_type === verificationType
    );
  }

  if (accountStatus) {
    filteredData = filteredData.filter(alert =>
      alert.accounts?.account_status === accountStatus
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter(alert =>
      alert.accounts?.user_id?.toLowerCase().includes(searchLower) ||
      alert.accounts?.first_name?.toLowerCase().includes(searchLower) ||
      alert.accounts?.last_name?.toLowerCase().includes(searchLower) ||
      alert.accounts?.email?.toLowerCase().includes(searchLower)
    );
  }

  res.json({
    success: true,
    data: filteredData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}));

/**
 * @route   POST /api/alerts
 * @desc    Create a new alert manually
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('account_id').notEmpty().withMessage('Account ID is required'),
    body('alert_type').notEmpty().withMessage('Alert type is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
    body('resolution_notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tenantId, id: userId } = req.user;
    const { account_id, alert_type, priority, resolution_notes } = req.body;

    // Verify account exists
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Create alert
    const { data, error } = await supabaseAdmin
      .from('kyc_alerts')
      .insert({
        tenant_id: tenantId,
        account_id,
        alert_type,
        priority: priority || 'medium',
        resolution_notes: resolution_notes || null,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        alert_id: data.id,
        account_id,
        action: 'ALERT_CREATED',
        description: `Manual alert created: ${alert_type}`,
        user_id: userId
      });

    res.status(201).json({
      success: true,
      data,
      message: 'Alert created successfully'
    });
  })
);

/**
 * @route   GET /api/alerts/:id
 * @desc    Get alert details by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('kyc_alerts')
    .select(`
      *,
      accounts (*),
      assigned_user:users!kyc_alerts_assigned_to_fkey (id, full_name, email),
      resolved_user:users!kyc_alerts_resolved_by_fkey (id, full_name, email)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   PATCH /api/alerts/:id/status
 * @desc    Update alert status
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.patch('/:id/status',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('status').isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const updateData = { status };

    // If marking as in_progress, assign to current user
    if (status === 'in_progress') {
      updateData.assigned_to = userId;
      updateData.assigned_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('kyc_alerts')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        alert_id: id,
        account_id: data.account_id,
        action: 'ALERT_STATUS_UPDATE',
        description: `Alert status changed to ${status}`,
        user_id: userId
      });

    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route   POST /api/alerts/:id/actions
 * @desc    Perform manual actions on alerts (Approve/Decline/Clean/Suspicious/False Positive)
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/:id/actions',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('action').isIn(['APPROVE', 'DECLINE', 'CLEAN', 'SUSPICIOUS', 'FALSE_POSITIVE']).withMessage('Invalid action'),
    body('reason').optional().isString(),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    const { action, reason, notes } = req.body;

    // Get alert details
    const { data: alert, error: alertError } = await supabaseAdmin
      .from('kyc_alerts')
      .select('*, accounts(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (alertError || !alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Perform action based on type
    let resolution = null;
    let accountUpdate = {};
    let description = '';

    switch (action) {
      case 'APPROVE':
        resolution = 'approved';
        accountUpdate = {
          kyc_verification_status: 'verified',
          account_status: 'active'
        };
        description = 'KYC verification approved manually';
        break;

      case 'DECLINE':
        resolution = 'declined';
        accountUpdate = {
          kyc_verification_status: 'failed',
          account_status: 'suspended'
        };
        description = 'KYC verification declined';
        break;

      case 'CLEAN':
        resolution = 'clean';
        accountUpdate = {
          pep_sanctions_status: 'clear'
        };
        description = 'Marked as clean (no AML/sanctions match)';
        break;

      case 'SUSPICIOUS':
        resolution = 'suspicious';
        accountUpdate = {
          account_status: 'suspended'
        };
        description = 'Flagged as suspicious for further investigation';
        break;

      case 'FALSE_POSITIVE':
        resolution = 'false_positive';
        description = 'Marked as false positive';
        break;
    }

    // Update alert
    const { data: updatedAlert, error: updateError } = await supabaseAdmin
      .from('kyc_alerts')
      .update({
        status: 'resolved',
        resolution,
        resolution_notes: notes || reason,
        resolved_by: userId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update account if needed
    if (Object.keys(accountUpdate).length > 0) {
      await supabaseAdmin
        .from('accounts')
        .update(accountUpdate)
        .eq('id', alert.account_id)
        .eq('tenant_id', tenantId);
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        alert_id: id,
        account_id: alert.account_id,
        action: `ALERT_ACTION_${action}`,
        description: `${description}. ${reason || ''}`.trim(),
        user_id: userId
      });

    // Add note if provided
    if (notes) {
      await supabaseAdmin
        .from('notes')
        .insert({
          tenant_id: tenantId,
          account_id: alert.account_id,
          description: `Alert Action (${action}): ${notes}`,
          created_by: userId
        });
    }

    res.json({
      success: true,
      data: updatedAlert,
      message: `Action ${action} completed successfully`
    });
  })
);

/**
 * @route   POST /api/alerts/:id/assign
 * @desc    Assign alert to a user
 * @access  Private (Team Lead, Manager, MLRO)
 */
router.post('/:id/assign',
  preventViewOnlyModifications,
  authorize(['team_lead', 'manager', 'mlro']),
  [
    body('assignedTo').notEmpty().withMessage('Assigned user ID is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tenantId, id: userId } = req.user;
    const { id } = req.params;
    const { assignedTo } = req.body;

    // Verify assigned user exists and belongs to tenant
    const { data: assignedUser } = await supabaseAdmin
      .from('users')
      .select('id, full_name')
      .eq('id', assignedTo)
      .eq('tenant_id', tenantId)
      .single();

    if (!assignedUser) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user for assignment'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('kyc_alerts')
      .update({
        assigned_to: assignedTo,
        assigned_at: new Date().toISOString(),
        status: 'in_progress'
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        alert_id: id,
        account_id: data.account_id,
        action: 'ALERT_ASSIGNED',
        description: `Alert assigned to ${assignedUser.full_name}`,
        user_id: userId
      });

    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route   POST /api/alerts/export
 * @desc    Export alerts to Excel
 * @access  Private
 */
router.post('/export',
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { filters } = req.body;

    // TODO: Implement Excel export logic

    res.json({
      success: true,
      message: 'Export functionality to be implemented'
    });
  })
);

/**
 * @route   GET /api/alerts/queue/summary
 * @desc    Get alert queue summary (for dashboard widgets)
 * @access  Private
 */
router.get('/queue/summary', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;

  // Count alerts by type
  const { data: alerts } = await supabaseAdmin
    .from('kyc_alerts')
    .select('alert_type, status')
    .eq('tenant_id', tenantId);

  const summary = {
    total: alerts.length,
    byType: {},
    byStatus: {},
    pending: 0
  };

  alerts.forEach(alert => {
    // Count by type
    summary.byType[alert.alert_type] = (summary.byType[alert.alert_type] || 0) + 1;

    // Count by status
    summary.byStatus[alert.status] = (summary.byStatus[alert.status] || 0) + 1;

    // Count pending
    if (['open', 'in_progress'].includes(alert.status)) {
      summary.pending++;
    }
  });

  res.json({
    success: true,
    data: summary
  });
}));

export default router;
