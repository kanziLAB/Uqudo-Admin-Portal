import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorize, preventViewOnlyModifications } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/accounts
 * @desc    Get list of accounts with filtering, search, and pagination
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
    search
  } = req.query;

  // Build query
  let query = supabaseAdmin
    .from('accounts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate);
  }

  if (verificationChannel) {
    query = query.eq('verification_channel', verificationChannel);
  }

  if (verificationType) {
    query = query.eq('verification_type', verificationType);
  }

  if (accountStatus) {
    query = query.eq('account_status', accountStatus);
  }

  // Search by user_id, name, email, or ID number
  if (search) {
    query = query.or(`user_id.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,id_number.ilike.%${search}%`);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  res.json({
    success: true,
    data: data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}));

/**
 * @route   GET /api/accounts/:id
 * @desc    Get account details by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   POST /api/accounts
 * @desc    Create new account manually
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('user_id').notEmpty().withMessage('User ID is required'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('date_of_birth').notEmpty().isISO8601().withMessage('Valid date of birth required'),
    body('id_type').isIn(['passport', 'eid', 'driving_license', 'visa', 'pan_card']).withMessage('Valid ID type required'),
    body('id_number').notEmpty().withMessage('ID number is required'),
    body('nationality').optional(),
    body('gender').optional()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { tenantId, id: userId } = req.user;
    const accountData = {
      tenant_id: tenantId,
      user_id: req.body.user_id,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      phone_number: req.body.phone_number,
      date_of_birth: req.body.date_of_birth,
      id_type: req.body.id_type,
      id_number: req.body.id_number,
      nationality: req.body.nationality || null,
      gender: req.body.gender || null,
      account_status: 'active',
      kyc_verification_status: 'unverified'
    };

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', req.body.user_id)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Account with this user ID already exists'
      });
    }

    // Create account
    const { data, error } = await supabaseAdmin
      .from('accounts')
      .insert(accountData)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabaseAdmin.from('analyst_logs').insert({
      tenant_id: tenantId,
      account_id: data.id,
      action: 'ACCOUNT_CREATED',
      description: `Manually created account for ${data.first_name} ${data.last_name}`,
      user_id: userId
    });

    res.status(201).json({ success: true, data });
  })
);

/**
 * @route   PATCH /api/accounts/:id
 * @desc    Update account details
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.patch('/:id',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;

    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      nationality,
      id_type,
      id_number,
      issuing_place,
      expiry_date,
      address,
      province_emirate,
      country_of_residence,
      phone_number,
      email,
      kyc_verification_status,
      account_status
    } = req.body;

    // Build update object
    const updateData = {
      ...(first_name && { first_name }),
      ...(last_name && { last_name }),
      ...(date_of_birth && { date_of_birth }),
      ...(gender && { gender }),
      ...(nationality && { nationality }),
      ...(id_type && { id_type }),
      ...(id_number && { id_number }),
      ...(issuing_place && { issuing_place }),
      ...(expiry_date && { expiry_date }),
      ...(address && { address }),
      ...(province_emirate && { province_emirate }),
      ...(country_of_residence && { country_of_residence }),
      ...(phone_number && { phone_number }),
      ...(email && { email }),
      ...(kyc_verification_status && { kyc_verification_status }),
      ...(account_status && { account_status }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('accounts')
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
        account_id: id,
        action: 'UPDATE_ACCOUNT',
        description: 'Account details updated',
        user_id: userId
      });

    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route   GET /api/accounts/:id/verification-tickets
 * @desc    Get verification tickets for an account
 * @access  Private
 */
router.get('/:id/verification-tickets', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('verification_tickets')
    .select('*')
    .eq('account_id', id)
    .eq('tenant_id', tenantId)
    .order('created_time', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   GET /api/accounts/:id/verification-tickets/:ticketId
 * @desc    Get verification ticket details
 * @access  Private
 */
router.get('/:id/verification-tickets/:ticketId', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id, ticketId } = req.params;

  const { data, error } = await supabaseAdmin
    .from('verification_tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('account_id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: 'Verification ticket not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   PATCH /api/accounts/:id/verification-tickets/:ticketId
 * @desc    Manually update verification ticket result
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.patch('/:id/verification-tickets/:ticketId',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('result').isIn(['pass', 'fail']).withMessage('Result must be either pass or fail')
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
    const { id, ticketId } = req.params;
    const { result, reason } = req.body;

    const { data, error } = await supabaseAdmin
      .from('verification_tickets')
      .update({
        result,
        reason,
        finished_time: new Date().toISOString()
      })
      .eq('id', ticketId)
      .eq('account_id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Update account KYC status if needed
    if (result === 'pass') {
      await supabaseAdmin
        .from('accounts')
        .update({ kyc_verification_status: 'verified' })
        .eq('id', id)
        .eq('tenant_id', tenantId);
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        account_id: id,
        action: 'MANUAL_TICKET_UPDATE',
        description: `Verification ticket manually updated to ${result}`,
        user_id: userId
      });

    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route   POST /api/accounts/:id/documents/request
 * @desc    Request documents from customer
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/:id/documents/request',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('documentTypes').isArray().withMessage('Document types must be an array'),
    body('notificationChannels').isArray().withMessage('Notification channels must be an array'),
    body('message').optional().isString(),
    body('expiryTime').notEmpty().withMessage('Expiry time is required')
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
    const { documentTypes, notificationChannels, message, expiryTime } = req.body;

    // Create document request
    const { data, error } = await supabaseAdmin
      .from('document_requests')
      .insert({
        tenant_id: tenantId,
        account_id: id,
        document_types: documentTypes,
        notification_channels: notificationChannels,
        message: message || 'Please upload the requested documents',
        expiry_time: expiryTime,
        requested_by: userId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        account_id: id,
        action: 'DOCUMENT_REQUEST',
        description: `Requested documents: ${documentTypes.join(', ')}`,
        user_id: userId
      });

    // TODO: Send notifications via selected channels (email, customer portal, etc.)

    res.json({
      success: true,
      data,
      message: 'Document request sent successfully'
    });
  })
);

/**
 * @route   GET /api/accounts/:id/documents
 * @desc    Get documents for an account
 * @access  Private
 */
router.get('/:id/documents', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('account_id', id)
    .eq('tenant_id', tenantId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   PATCH /api/accounts/:id/documents/:docId/compliance
 * @desc    Update document compliance status
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.patch('/:id/documents/:docId/compliance',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('complianceStatus').isIn(['compliant', 'non_compliant']).withMessage('Invalid compliance status')
  ],
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { id, docId } = req.params;
    const { complianceStatus } = req.body;

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        compliance_status: complianceStatus,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', docId)
      .eq('account_id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        account_id: id,
        action: 'DOCUMENT_REVIEW',
        description: `Document marked as ${complianceStatus}`,
        user_id: userId
      });

    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route   GET /api/accounts/:id/analyst-logs
 * @desc    Get analyst activity logs for an account
 * @access  Private
 */
router.get('/:id/analyst-logs', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('analyst_logs')
    .select('*, users(full_name, email, department)')
    .eq('account_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   POST /api/accounts/:id/notes
 * @desc    Add a note to an account
 * @access  Private (All roles except view-only)
 */
router.post('/:id/notes',
  preventViewOnlyModifications,
  [
    body('description').notEmpty().withMessage('Note description is required')
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
    const { description, attachmentUrl } = req.body;

    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({
        tenant_id: tenantId,
        account_id: id,
        description,
        attachment_url: attachmentUrl || null,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        account_id: id,
        action: 'NOTE_ADDED',
        description: 'Added a note to account',
        user_id: userId
      });

    res.json({
      success: true,
      data
    });
  })
);

/**
 * @route   GET /api/accounts/:id/notes
 * @desc    Get notes for an account
 * @access  Private
 */
router.get('/:id/notes', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('*, users(full_name, email)')
    .eq('account_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   GET /api/accounts/:id/biometric
 * @desc    Get biometric data for display
 * @access  Private
 */
router.get('/:id/biometric', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('biometric_data')
    .select('*')
    .eq('account_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data: data.length > 0 ? data[0] : null
  });
}));

/**
 * @route   GET /api/accounts/:id/device-attestation
 * @desc    Get device attestation data
 * @access  Private
 */
router.get('/:id/device-attestation', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('device_attestation')
    .select('*')
    .eq('account_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data: data.length > 0 ? data[0] : null
  });
}));

/**
 * @route   POST /api/accounts/export
 * @desc    Export accounts to Excel
 * @access  Private
 */
router.post('/export',
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { filters } = req.body;

    // Build query with filters (similar to GET /accounts)
    let query = supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('tenant_id', tenantId);

    // Apply filters...
    // TODO: Implement Excel export logic

    res.json({
      success: true,
      message: 'Export functionality to be implemented'
    });
  })
);

export default router;
