import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorize, preventViewOnlyModifications } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// KYC SETUP CONFIGURATION
// ============================================================================

/**
 * @route   GET /api/config/kyc-setup
 * @desc    Get KYC configuration settings
 * @access  Private (All roles)
 */
router.get('/kyc-setup', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;

  const { data, error } = await supabaseAdmin
    .from('kyc_setup')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }

  // Return default settings if not configured yet
  const defaultSettings = {
    tenant_id: tenantId,
    eid_verification_enabled: true,
    ocr_enabled: true,
    manual_review_required: true,
    duplicate_check_enabled: true,
    pep_screening_enabled: true,
    sanctions_screening_enabled: true,
    adverse_media_enabled: false,
    document_expiry_grace_days: 30,
    auto_approve_threshold: 95,
    auto_reject_threshold: 30,
    require_liveness_check: true,
    require_device_attestation: false,
    sdk_verification_thresholds: {
      face_match: 80,
      liveness: 70,
      document_quality: 60,
      face_quality: 70,
      ocr_confidence: 80,
      nfc_reading: 90,
      passive_authentication: 85,
      background_check_risk: 70
    },
    analytics_config: {
      ux_benchmarks: {
        document_scan: 30,
        nfc_reading: 15,
        face_verification: 20,
        background_check: 5
      },
      risk_thresholds: {
        low: 50,
        medium: 100,
        high: 200
      },
      friction_thresholds: {
        low: 30,
        medium: 70
      },
      device_risk: {
        multiple_attempts_threshold: 2,
        low_success_rate_threshold: 50,
        rapid_retry_window_minutes: 60,
        fraud_flags_threshold: 5
      },
      portfolio_defaults: {
        default_date_range: '30',
        completion_rate_target: 85,
        abandonment_rate_target: 10,
        review_rate_target: 20
      }
    }
  };

  res.json({
    success: true,
    data: data || defaultSettings
  });
}));

/**
 * @route   PUT /api/config/kyc-setup
 * @desc    Update KYC configuration settings
 * @access  Private (Manager, MLRO)
 */
router.put('/kyc-setup',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  [
    body('eid_verification_enabled').optional().isBoolean(),
    body('ocr_enabled').optional().isBoolean(),
    body('manual_review_required').optional().isBoolean(),
    body('duplicate_check_enabled').optional().isBoolean(),
    body('pep_screening_enabled').optional().isBoolean(),
    body('sanctions_screening_enabled').optional().isBoolean(),
    body('adverse_media_enabled').optional().isBoolean(),
    body('document_expiry_grace_days').optional().isInt({ min: 0, max: 365 }),
    body('auto_approve_threshold').optional().isInt({ min: 0, max: 100 }),
    body('auto_reject_threshold').optional().isInt({ min: 0, max: 100 }),
    body('require_liveness_check').optional().isBoolean(),
    body('require_device_attestation').optional().isBoolean(),
    body('analytics_config').optional().isObject(),
    body('sdk_risk_thresholds').optional().isObject(),
    body('sdk_verification_thresholds').optional().isObject()
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
    const settings = req.body;

    // Check if settings exist
    const { data: existing } = await supabaseAdmin
      .from('kyc_setup')
      .select('id')
      .eq('tenant_id', tenantId)
      .single();

    let data, error;

    if (existing) {
      // Update existing settings
      ({ data, error } = await supabaseAdmin
        .from('kyc_setup')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .select()
        .single());
    } else {
      // Insert new settings
      ({ data, error } = await supabaseAdmin
        .from('kyc_setup')
        .insert({
          tenant_id: tenantId,
          ...settings
        })
        .select()
        .single());
    }

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'KYC_SETUP_UPDATE',
        description: 'KYC configuration settings updated',
        user_id: userId
      });

    res.json({
      success: true,
      data,
      message: 'KYC setup updated successfully'
    });
  })
);

// ============================================================================
// BLOCKLIST MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/config/blocklist
 * @desc    Get blocklist entries with filtering and pagination
 * @access  Private (All roles)
 */
router.get('/blocklist', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const {
    page = 1,
    limit = 20,
    search,
    type,
    source
  } = req.query;

  // Build query
  let query = supabaseAdmin
    .from('blocklist')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (type) {
    query = query.eq('type', type);
  }

  if (source) {
    query = query.eq('source', source);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,identifier.ilike.%${search}%,notes.ilike.%${search}%`);
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
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}));

/**
 * @route   GET /api/config/blocklist/:id
 * @desc    Get blocklist entry by ID
 * @access  Private (All roles)
 */
router.get('/blocklist/:id', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('blocklist')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: 'Blocklist entry not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   POST /api/config/blocklist
 * @desc    Add entry to blocklist
 * @access  Private (Team Lead, Manager, MLRO)
 */
router.post('/blocklist',
  preventViewOnlyModifications,
  authorize(['team_lead', 'manager', 'mlro']),
  [
    body('type').isIn(['pep', 'sanctions', 'adverse_media', 'custom']).withMessage('Invalid blocklist type'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('identifier').optional().isString(),
    body('date_of_birth').optional().isISO8601(),
    body('nationality').optional().isString(),
    body('source').notEmpty().withMessage('Source is required'),
    body('notes').optional().isString(),
    body('create_alert').optional().isBoolean()
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
    const entryData = req.body;

    // Check for duplicates
    const { data: existing } = await supabaseAdmin
      .from('blocklist')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('full_name', entryData.full_name)
      .eq('date_of_birth', entryData.date_of_birth)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'This entry already exists in the blocklist'
      });
    }

    // Insert entry
    const { data, error } = await supabaseAdmin
      .from('blocklist')
      .insert({
        tenant_id: tenantId,
        ...entryData,
        added_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Check if we should create alerts for matching accounts
    if (req.body.create_alert && entryData.full_name) {
      const nameParts = entryData.full_name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(-1)[0];

      // Search for matching accounts
      let matchQuery = supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('tenant_id', tenantId);

      // Match on name and identifier if provided
      if (entryData.identifier) {
        matchQuery = matchQuery.or(`id_number.eq.${entryData.identifier}`);
      }

      const { data: matchingAccounts } = await matchQuery;

      if (matchingAccounts && matchingAccounts.length > 0) {
        const alertsToCreate = matchingAccounts.map(account => ({
          tenant_id: tenantId,
          account_id: account.id,
          alert_type: 'blocklist_match',
          priority: 'critical',
          resolution_notes: `Account matches blocklist entry: ${entryData.full_name} (${entryData.type})`,
          status: 'open'
        }));

        await supabaseAdmin.from('kyc_alerts').insert(alertsToCreate);
      }
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'BLOCKLIST_ADD',
        description: `Added ${entryData.full_name} to blocklist`,
        user_id: userId
      });

    res.status(201).json({
      success: true,
      data,
      message: 'Entry added to blocklist successfully'
    });
  })
);

/**
 * @route   PUT /api/config/blocklist/:id
 * @desc    Update blocklist entry
 * @access  Private (Team Lead, Manager, MLRO)
 */
router.put('/blocklist/:id',
  preventViewOnlyModifications,
  authorize(['team_lead', 'manager', 'mlro']),
  [
    body('type').optional().isIn(['pep', 'sanctions', 'adverse_media', 'custom']),
    body('full_name').optional().notEmpty(),
    body('identifier').optional().isString(),
    body('date_of_birth').optional().isISO8601(),
    body('nationality').optional().isString(),
    body('source').optional().notEmpty(),
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
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('blocklist')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Blocklist entry not found'
      });
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'BLOCKLIST_UPDATE',
        description: `Updated blocklist entry: ${data.full_name}`,
        user_id: userId
      });

    res.json({
      success: true,
      data,
      message: 'Blocklist entry updated successfully'
    });
  })
);

/**
 * @route   DELETE /api/config/blocklist/:id
 * @desc    Delete blocklist entry
 * @access  Private (Manager, MLRO)
 */
router.delete('/blocklist/:id',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;

    // Get entry details before deletion
    const { data: entry } = await supabaseAdmin
      .from('blocklist')
      .select('full_name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Blocklist entry not found'
      });
    }

    const { error } = await supabaseAdmin
      .from('blocklist')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'BLOCKLIST_DELETE',
        description: `Deleted blocklist entry: ${entry.full_name}`,
        user_id: userId
      });

    res.json({
      success: true,
      message: 'Blocklist entry deleted successfully'
    });
  })
);

/**
 * @route   POST /api/config/blocklist/import
 * @desc    Bulk import blocklist entries
 * @access  Private (Manager, MLRO)
 */
router.post('/blocklist/import',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { entries, create_alert } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid import data'
      });
    }

    // Prepare entries for insertion
    const preparedEntries = entries.map(entry => ({
      tenant_id: tenantId,
      type: entry.type || 'custom',
      full_name: entry.full_name,
      identifier: entry.id_number || entry.identifier,
      date_of_birth: entry.date_of_birth,
      nationality: entry.nationality,
      source: entry.source || 'bulk_import',
      notes: entry.notes,
      added_by: userId
    }));

    const { data, error } = await supabaseAdmin
      .from('blocklist')
      .insert(preparedEntries)
      .select();

    if (error) throw error;

    // Check if we should create alerts for matching accounts
    if (create_alert) {
      for (const entry of data) {
        if (entry.full_name) {
          let matchQuery = supabaseAdmin
            .from('accounts')
            .select('id')
            .eq('tenant_id', tenantId);

          // Match on identifier if provided
          if (entry.identifier) {
            matchQuery = matchQuery.or(`id_number.eq.${entry.identifier}`);
          }

          const { data: matchingAccounts } = await matchQuery;

          if (matchingAccounts && matchingAccounts.length > 0) {
            const alertsToCreate = matchingAccounts.map(account => ({
              tenant_id: tenantId,
              account_id: account.id,
              alert_type: 'blocklist_match',
              priority: 'critical',
              resolution_notes: `Account matches blocklist entry: ${entry.full_name} (${entry.type})`,
              status: 'open'
            }));

            await supabaseAdmin.from('kyc_alerts').insert(alertsToCreate);
          }
        }
      }
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'BLOCKLIST_BULK_IMPORT',
        description: `Imported ${data.length} entries to blocklist`,
        user_id: userId
      });

    res.json({
      success: true,
      data: {
        imported: data.length,
        entries: data
      },
      message: `Successfully imported ${data.length} entries`
    });
  })
);

// ============================================================================
// RULE ENGINE
// ============================================================================

/**
 * @route   GET /api/config/rules
 * @desc    Get all rules with filtering
 * @access  Private (All roles)
 */
router.get('/rules', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { type, status } = req.query;

  let query = supabaseAdmin
    .from('rules')
    .select('*, created_user:users!rules_created_by_fkey(id, full_name)')
    .eq('tenant_id', tenantId);

  if (type) {
    query = query.eq('rule_type', type);
  }

  if (status) {
    query = query.eq('is_active', status === 'active');
  }

  query = query.order('priority', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   GET /api/config/rules/:id
 * @desc    Get rule by ID
 * @access  Private (All roles)
 */
router.get('/rules/:id', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('rules')
    .select('*, created_user:users!rules_created_by_fkey(id, full_name, email)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: 'Rule not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   POST /api/config/rules
 * @desc    Create new rule
 * @access  Private (Team Lead, Manager, MLRO)
 */
router.post('/rules',
  preventViewOnlyModifications,
  authorize(['team_lead', 'manager', 'mlro']),
  [
    body('rule_name').notEmpty().withMessage('Rule name is required'),
    body('rule_type').isIn(['duplicate_detection', 'risk_scoring', 'auto_approval', 'alert_trigger']).withMessage('Invalid rule type'),
    body('conditions').isObject().withMessage('Conditions must be an object'),
    body('actions').isObject().withMessage('Actions must be an object'),
    body('priority').optional().isInt({ min: 0, max: 100 }),
    body('description').optional().isString()
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
    const ruleData = req.body;

    const { data, error } = await supabaseAdmin
      .from('rules')
      .insert({
        tenant_id: tenantId,
        rule_name: ruleData.rule_name,
        rule_type: ruleData.rule_type,
        description: ruleData.description,
        conditions: ruleData.conditions,
        actions: ruleData.actions,
        priority: ruleData.priority || 50,
        is_active: true,
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
        action: 'RULE_CREATE',
        description: `Created rule: ${ruleData.rule_name}`,
        user_id: userId
      });

    res.status(201).json({
      success: true,
      data,
      message: 'Rule created successfully'
    });
  })
);

/**
 * @route   PUT /api/config/rules/:id
 * @desc    Update rule
 * @access  Private (Team Lead, Manager, MLRO)
 */
router.put('/rules/:id',
  preventViewOnlyModifications,
  authorize(['team_lead', 'manager', 'mlro']),
  [
    body('rule_name').optional().notEmpty(),
    body('rule_type').optional().isIn(['duplicate_detection', 'risk_scoring', 'auto_approval', 'alert_trigger']),
    body('conditions').optional().isObject(),
    body('actions').optional().isObject(),
    body('priority').optional().isInt({ min: 0, max: 100 }),
    body('description').optional().isString(),
    body('is_active').optional().isBoolean()
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
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found'
      });
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'RULE_UPDATE',
        description: `Updated rule: ${data.rule_name}`,
        user_id: userId
      });

    res.json({
      success: true,
      data,
      message: 'Rule updated successfully'
    });
  })
);

/**
 * @route   DELETE /api/config/rules/:id
 * @desc    Delete rule
 * @access  Private (Manager, MLRO)
 */
router.delete('/rules/:id',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;

    // Get rule details before deletion
    const { data: rule } = await supabaseAdmin
      .from('rules')
      .select('rule_name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found'
      });
    }

    const { error } = await supabaseAdmin
      .from('rules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'RULE_DELETE',
        description: `Deleted rule: ${rule.rule_name}`,
        user_id: userId
      });

    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  })
);

/**
 * @route   PATCH /api/config/rules/:id/toggle
 * @desc    Toggle rule active status
 * @access  Private (Team Lead, Manager, MLRO)
 */
router.patch('/rules/:id/toggle',
  preventViewOnlyModifications,
  authorize(['team_lead', 'manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { id } = req.params;

    // Get current status
    const { data: rule } = await supabaseAdmin
      .from('rules')
      .select('is_active, rule_name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found'
      });
    }

    // Toggle status
    const { data, error } = await supabaseAdmin
      .from('rules')
      .update({
        is_active: !rule.is_active,
        updated_at: new Date().toISOString()
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
        action: 'RULE_TOGGLE',
        description: `${data.is_active ? 'Activated' : 'Deactivated'} rule: ${rule.rule_name}`,
        user_id: userId
      });

    res.json({
      success: true,
      data,
      message: `Rule ${data.is_active ? 'activated' : 'deactivated'} successfully`
    });
  })
);

// ============================================================================
// COUNTRY MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/config/countries
 * @desc    Get all countries with configuration
 * @access  Private (All roles)
 */
router.get('/countries', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { status } = req.query;

  let query = supabaseAdmin
    .from('countries')
    .select('*')
    .eq('tenant_id', tenantId);

  if (status) {
    query = query.eq('is_enabled', status === 'enabled');
  }

  query = query.order('country_name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   POST /api/config/countries
 * @desc    Add new country configuration
 * @access  Private (Manager, MLRO)
 */
router.post('/countries',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  [
    body('country_code').notEmpty().withMessage('Country code is required'),
    body('country_name').notEmpty().withMessage('Country name is required'),
    body('is_enabled').optional().isBoolean(),
    body('risk_level').optional().isIn(['low', 'medium', 'high']),
    body('requires_additional_verification').optional().isBoolean()
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
    const { country_code, country_name, is_enabled, risk_level, requires_additional_verification } = req.body;

    // Check if country already exists
    const { data: existing } = await supabaseAdmin
      .from('country_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('country_code', country_code)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Country configuration already exists'
      });
    }

    // Create country configuration
    const { data, error } = await supabaseAdmin
      .from('country_settings')
      .insert({
        tenant_id: tenantId,
        country_code,
        country_name,
        is_enabled: is_enabled !== undefined ? is_enabled : true,
        risk_level: risk_level || 'medium',
        requires_additional_verification: requires_additional_verification || false
      })
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabaseAdmin.from('analyst_logs').insert({
      tenant_id: tenantId,
      action: 'COUNTRY_ADDED',
      description: `Added country configuration: ${country_name}`,
      user_id: userId
    });

    res.status(201).json({
      success: true,
      data,
      message: 'Country added successfully'
    });
  })
);

/**
 * @route   PATCH /api/config/countries/:id
 * @desc    Update country configuration
 * @access  Private (Manager, MLRO)
 */
router.patch('/countries/:id',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  [
    body('is_enabled').optional().isBoolean(),
    body('risk_level').optional().isIn(['low', 'medium', 'high']),
    body('requires_additional_verification').optional().isBoolean()
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
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('countries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Country not found'
      });
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'COUNTRY_UPDATE',
        description: `Updated country configuration: ${data.country_name}`,
        user_id: userId
      });

    res.json({
      success: true,
      data,
      message: 'Country configuration updated successfully'
    });
  })
);

/**
 * @route   POST /api/config/countries/bulk-update
 * @desc    Bulk update country configurations
 * @access  Private (Manager, MLRO)
 */
router.post('/countries/bulk-update',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { country_ids, updates } = req.body;

    if (!Array.isArray(country_ids) || country_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country IDs'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('countries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', country_ids)
      .eq('tenant_id', tenantId)
      .select();

    if (error) throw error;

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'COUNTRY_BULK_UPDATE',
        description: `Bulk updated ${data.length} countries`,
        user_id: userId
      });

    res.json({
      success: true,
      data: {
        updated: data.length,
        countries: data
      },
      message: `Successfully updated ${data.length} countries`
    });
  })
);

export default router;
