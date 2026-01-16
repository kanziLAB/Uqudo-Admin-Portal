import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorize, preventViewOnlyModifications } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/cases
 * @desc    Get list of AML cases with filtering and pagination
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    resolutionStatus,
    accountStatus,
    actionBy,
    search
  } = req.query;

  // Build query
  let query = supabaseAdmin
    .from('aml_cases')
    .select(`
      *,
      accounts (
        user_id,
        first_name,
        last_name,
        email,
        account_status
      ),
      action_user:users!aml_cases_action_by_fkey (id, full_name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate);
  }

  if (resolutionStatus) {
    query = query.eq('resolution_status', resolutionStatus);
  }

  if (actionBy) {
    query = query.eq('action_by', actionBy);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Additional filtering
  let filteredData = data;

  if (accountStatus) {
    filteredData = filteredData.filter(case_ =>
      case_.accounts?.account_status === accountStatus
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter(case_ =>
      case_.case_id?.toLowerCase().includes(searchLower) ||
      case_.accounts?.user_id?.toLowerCase().includes(searchLower) ||
      case_.accounts?.first_name?.toLowerCase().includes(searchLower) ||
      case_.accounts?.last_name?.toLowerCase().includes(searchLower) ||
      case_.accounts?.email?.toLowerCase().includes(searchLower)
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
 * @route   POST /api/cases
 * @desc    Create new case manually
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('account_id').notEmpty().withMessage('Account ID is required'),
    body('case_id').notEmpty().withMessage('Case ID is required'),
    body('alert_ids').optional().isArray(),
    body('match_count').optional().isInt(),
    body('external_case_url').optional({ checkFalsy: true }).isURL()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { tenantId, id: userId } = req.user;
    const { account_id, case_id, alert_ids, match_count, external_case_url } = req.body;

    // Verify account exists
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    // Create case with alert_ids in JSON field
    const { data, error } = await supabaseAdmin
      .from('aml_cases')
      .insert({
        tenant_id: tenantId,
        account_id,
        case_id,
        match_count: match_count || 0,
        external_case_url: external_case_url || null,
        resolution_status: 'unsolved',
        alert_ids: alert_ids || []
      })
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabaseAdmin.from('analyst_logs').insert({
      tenant_id: tenantId,
      case_id: data.id,
      account_id,
      action: 'CASE_CREATED',
      description: `Case ${case_id} created with ${alert_ids?.length || 0} alerts`,
      user_id: userId
    });

    res.status(201).json({ success: true, data });
  })
);

/**
 * @route   GET /api/cases/:id
 * @desc    Get case details by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('aml_cases')
    .select(`
      *,
      accounts (*),
      action_user:users!aml_cases_action_by_fkey (id, full_name, email)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: 'Case not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   POST /api/cases/:id/actions
 * @desc    Perform actions on AML cases (Approve/Decline/Clean/Suspicious/False Positive)
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/:id/actions',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('action').isIn(['APPROVE', 'DECLINE', 'CLEAN', 'SUSPICIOUS', 'FALSE_POSITIVE']).withMessage('Invalid action'),
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
    const { action, notes } = req.body;

    // Get case details
    const { data: amlCase, error: caseError } = await supabaseAdmin
      .from('aml_cases')
      .select('*, accounts(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (caseError || !amlCase) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    // Determine resolution status and account updates
    let resolutionStatus = null;
    let accountUpdate = {};
    let description = '';

    switch (action) {
      case 'APPROVE':
        resolutionStatus = 'false';
        accountUpdate = {
          pep_sanctions_status: 'clear',
          account_status: 'active'
        };
        description = 'AML case approved - no match';
        break;

      case 'DECLINE':
        resolutionStatus = 'positive';
        accountUpdate = {
          pep_sanctions_status: 'positive',
          account_status: 'blocked'
        };
        description = 'AML case declined - confirmed match';
        break;

      case 'CLEAN':
        resolutionStatus = 'false';
        accountUpdate = {
          pep_sanctions_status: 'clear'
        };
        description = 'Marked as clean (false positive)';
        break;

      case 'SUSPICIOUS':
        resolutionStatus = 'positive';
        accountUpdate = {
          pep_sanctions_status: 'in_process',
          account_status: 'suspended'
        };
        description = 'Marked as suspicious for further review';
        break;

      case 'FALSE_POSITIVE':
        resolutionStatus = 'false';
        accountUpdate = {
          pep_sanctions_status: 'clear'
        };
        description = 'Marked as false positive';
        break;
    }

    // Update case
    const { data: updatedCase, error: updateError } = await supabaseAdmin
      .from('aml_cases')
      .update({
        resolution_status: resolutionStatus,
        action_by: userId,
        last_updated_time: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update account
    if (Object.keys(accountUpdate).length > 0) {
      await supabaseAdmin
        .from('accounts')
        .update(accountUpdate)
        .eq('id', amlCase.account_id)
        .eq('tenant_id', tenantId);
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        case_id: id,
        account_id: amlCase.account_id,
        action: `CASE_ACTION_${action}`,
        description,
        user_id: userId
      });

    // Add note if provided
    if (notes) {
      await supabaseAdmin
        .from('notes')
        .insert({
          tenant_id: tenantId,
          account_id: amlCase.account_id,
          description: `AML Case Action (${action}): ${notes}`,
          created_by: userId
        });
    }

    res.json({
      success: true,
      data: updatedCase,
      message: `Case action ${action} completed successfully`
    });
  })
);

/**
 * @route   PATCH /api/cases/:id/status
 * @desc    Update case resolution status
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.patch('/:id/status',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('resolutionStatus').isIn(['unsolved', 'false', 'positive']).withMessage('Invalid resolution status')
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
    const { resolutionStatus } = req.body;

    const { data, error } = await supabaseAdmin
      .from('aml_cases')
      .update({
        resolution_status: resolutionStatus,
        action_by: userId,
        last_updated_time: new Date().toISOString()
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
        case_id: id,
        account_id: data.account_id,
        action: 'CASE_STATUS_UPDATE',
        description: `Case resolution status changed to ${resolutionStatus}`,
        user_id: userId
      });

    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route   POST /api/cases/export
 * @desc    Export cases to Excel
 * @access  Private
 */
router.post('/export',
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user;

    // TODO: Implement Excel export

    res.json({
      success: true,
      message: 'Export functionality to be implemented'
    });
  })
);

export default router;
