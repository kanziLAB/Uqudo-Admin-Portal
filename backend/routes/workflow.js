import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorize, preventViewOnlyModifications } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/workflow/status
 * @desc    Get workflow orchestrator status
 * @access  Private (All roles)
 */
router.get('/status', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;

  // Get KYC setup to check if orchestrator is enabled
  const { data: setup } = await supabaseAdmin
    .from('kyc_setup')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  // Get statistics
  const { count: pendingAlerts } = await supabaseAdmin
    .from('kyc_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'pending');

  const { count: processingAlerts } = await supabaseAdmin
    .from('kyc_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'in_review');

  const { count: activeRules } = await supabaseAdmin
    .from('rules')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  res.json({
    success: true,
    data: {
      orchestrator_enabled: setup?.manual_review_required !== false,
      duplicate_check_enabled: setup?.duplicate_check_enabled || false,
      pep_screening_enabled: setup?.pep_screening_enabled || false,
      sanctions_screening_enabled: setup?.sanctions_screening_enabled || false,
      statistics: {
        pending_alerts: pendingAlerts || 0,
        processing_alerts: processingAlerts || 0,
        active_rules: activeRules || 0
      },
      last_check: new Date().toISOString()
    }
  });
}));

/**
 * @route   POST /api/workflow/trigger/duplicate-check
 * @desc    Manually trigger duplicate account check for an account
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/trigger/duplicate-check',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('account_id').notEmpty().withMessage('Account ID is required')
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
    const { account_id } = req.body;

    // Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Check for potential duplicates based on:
    // 1. Same name + similar DOB
    // 2. Same email
    // 3. Same phone
    // 4. Same ID number
    const { data: duplicates, error: dupError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, first_name, last_name, email, phone_number, date_of_birth, account_status')
      .eq('tenant_id', tenantId)
      .neq('id', account_id)
      .or(`email.eq.${account.email},phone_number.eq.${account.phone_number},id_number.eq.${account.id_number}`);

    if (dupError) throw dupError;

    if (duplicates && duplicates.length > 0) {
      // Create duplicate alert
      const { data: alert, error: alertError } = await supabaseAdmin
        .from('kyc_alerts')
        .insert({
          tenant_id: tenantId,
          account_id: account.id,
          alert_type: 'duplicate_account',
          severity: 'high',
          status: 'pending',
          description: `Potential duplicate accounts detected: ${duplicates.length} match(es) found`,
          metadata: {
            duplicate_accounts: duplicates.map(d => ({
              id: d.id,
              user_id: d.user_id,
              name: `${d.first_name} ${d.last_name}`,
              email: d.email,
              phone: d.phone_number
            })),
            check_type: 'manual_trigger',
            triggered_by: userId
          }
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // Log the action
      await supabaseAdmin
        .from('analyst_logs')
        .insert({
          tenant_id: tenantId,
          account_id: account.id,
          action: 'DUPLICATE_CHECK_TRIGGERED',
          description: `Manual duplicate check triggered - ${duplicates.length} potential duplicate(s) found`,
          user_id: userId
        });

      return res.json({
        success: true,
        data: {
          alert_id: alert.id,
          duplicates_found: duplicates.length,
          duplicates: duplicates
        },
        message: `Duplicate check completed - ${duplicates.length} potential duplicate(s) found`
      });
    }

    // No duplicates found
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        action: 'DUPLICATE_CHECK_TRIGGERED',
        description: 'Manual duplicate check triggered - No duplicates found',
        user_id: userId
      });

    res.json({
      success: true,
      data: {
        duplicates_found: 0,
        duplicates: []
      },
      message: 'No duplicate accounts found'
    });
  })
);

/**
 * @route   POST /api/workflow/trigger/pep-screening
 * @desc    Manually trigger PEP/Sanctions screening for an account
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/trigger/pep-screening',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('account_id').notEmpty().withMessage('Account ID is required')
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
    const { account_id } = req.body;

    // Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Check against blocklist
    const fullName = `${account.first_name} ${account.last_name}`.toLowerCase();
    const { data: matches, error: matchError } = await supabaseAdmin
      .from('blocklist')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`full_name.ilike.%${fullName}%,identifier.eq.${account.id_number}`);

    if (matchError) throw matchError;

    if (matches && matches.length > 0) {
      // Create AML case for positive match
      const { data: amlCase, error: caseError } = await supabaseAdmin
        .from('aml_cases')
        .insert({
          tenant_id: tenantId,
          account_id: account.id,
          case_id: `AML-${Date.now()}-${account.user_id.substring(0, 8)}`,
          case_type: matches[0].type || 'pep',
          resolution_status: 'unsolved',
          risk_level: 'high',
          match_details: {
            matches: matches,
            screening_type: 'manual_trigger',
            triggered_by: userId
          }
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Update account status
      await supabaseAdmin
        .from('accounts')
        .update({
          pep_sanctions_status: 'in_process',
          account_status: 'suspended'
        })
        .eq('id', account.id);

      // Log the action
      await supabaseAdmin
        .from('analyst_logs')
        .insert({
          tenant_id: tenantId,
          account_id: account.id,
          case_id: amlCase.id,
          action: 'PEP_SCREENING_TRIGGERED',
          description: `PEP/Sanctions screening triggered - ${matches.length} match(es) found`,
          user_id: userId
        });

      return res.json({
        success: true,
        data: {
          case_id: amlCase.id,
          matches_found: matches.length,
          matches: matches
        },
        message: `PEP/Sanctions screening completed - ${matches.length} match(es) found`
      });
    }

    // No matches found - update account to clear
    await supabaseAdmin
      .from('accounts')
      .update({
        pep_sanctions_status: 'clear'
      })
      .eq('id', account.id);

    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        action: 'PEP_SCREENING_TRIGGERED',
        description: 'PEP/Sanctions screening triggered - No matches found',
        user_id: userId
      });

    res.json({
      success: true,
      data: {
        matches_found: 0,
        matches: []
      },
      message: 'No PEP/Sanctions matches found - Account cleared'
    });
  })
);

/**
 * @route   POST /api/workflow/trigger/id-expiry-check
 * @desc    Check for ID documents expiring soon
 * @access  Private (Manager, MLRO)
 */
router.post('/trigger/id-expiry-check',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId, id: userId } = req.user;

    // Get grace period from KYC setup
    const { data: setup } = await supabaseAdmin
      .from('kyc_setup')
      .select('document_expiry_grace_days')
      .eq('tenant_id', tenantId)
      .single();

    const graceDays = setup?.document_expiry_grace_days || 30;
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + graceDays);

    // Find accounts with expiring IDs
    const { data: expiringAccounts, error } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, first_name, last_name, email, id_expiry_date')
      .eq('tenant_id', tenantId)
      .eq('account_status', 'active')
      .lte('id_expiry_date', checkDate.toISOString())
      .gte('id_expiry_date', new Date().toISOString());

    if (error) throw error;

    let alertsCreated = 0;

    if (expiringAccounts && expiringAccounts.length > 0) {
      // Create alerts for expiring IDs
      const alerts = expiringAccounts.map(account => {
        const daysUntilExpiry = Math.ceil(
          (new Date(account.id_expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
        );

        return {
          tenant_id: tenantId,
          account_id: account.id,
          alert_type: 'id_expiry',
          severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
          status: 'pending',
          description: `ID document expiring in ${daysUntilExpiry} day(s)`,
          metadata: {
            expiry_date: account.id_expiry_date,
            days_until_expiry: daysUntilExpiry,
            check_type: 'scheduled_check',
            triggered_by: userId
          }
        };
      });

      const { data: createdAlerts, error: alertError } = await supabaseAdmin
        .from('kyc_alerts')
        .insert(alerts)
        .select();

      if (alertError) throw alertError;

      alertsCreated = createdAlerts.length;
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'ID_EXPIRY_CHECK_TRIGGERED',
        description: `ID expiry check completed - ${alertsCreated} alert(s) created`,
        user_id: userId
      });

    res.json({
      success: true,
      data: {
        accounts_checked: expiringAccounts?.length || 0,
        alerts_created: alertsCreated
      },
      message: `ID expiry check completed - ${alertsCreated} alert(s) created`
    });
  })
);

/**
 * @route   POST /api/workflow/trigger/rule-evaluation
 * @desc    Manually trigger rule evaluation for an account
 * @access  Private (Analyst, Team Lead, Manager, MLRO)
 */
router.post('/trigger/rule-evaluation',
  preventViewOnlyModifications,
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('account_id').notEmpty().withMessage('Account ID is required'),
    body('rule_id').optional().isString()
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
    const { account_id, rule_id } = req.body;

    // Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Get rules to evaluate
    let rulesQuery = supabaseAdmin
      .from('rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (rule_id) {
      rulesQuery = rulesQuery.eq('id', rule_id);
    }

    const { data: rules, error: rulesError } = await rulesQuery;

    if (rulesError) throw rulesError;

    if (!rules || rules.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active rules found'
      });
    }

    const evaluationResults = [];

    // Simple rule evaluation logic (can be extended)
    for (const rule of rules) {
      let matched = false;
      const conditions = rule.conditions;

      // Example: Check if account matches rule conditions
      if (conditions.account_status && account.account_status === conditions.account_status) {
        matched = true;
      }

      if (conditions.verification_type && account.verification_type === conditions.verification_type) {
        matched = true;
      }

      if (conditions.risk_level && account.pep_sanctions_status === conditions.risk_level) {
        matched = true;
      }

      evaluationResults.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        matched: matched,
        actions: matched ? rule.actions : null
      });

      // Execute actions if rule matched
      if (matched && rule.actions) {
        if (rule.actions.create_alert) {
          await supabaseAdmin
            .from('kyc_alerts')
            .insert({
              tenant_id: tenantId,
              account_id: account.id,
              alert_type: rule.actions.alert_type || 'manual_review',
              severity: rule.actions.severity || 'medium',
              status: 'pending',
              description: `Rule triggered: ${rule.rule_name}`,
              metadata: {
                rule_id: rule.id,
                rule_name: rule.rule_name,
                triggered_by: userId,
                trigger_type: 'manual_evaluation'
              }
            });
        }

        if (rule.actions.update_account_status) {
          await supabaseAdmin
            .from('accounts')
            .update({
              account_status: rule.actions.account_status
            })
            .eq('id', account.id);
        }
      }
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        action: 'RULE_EVALUATION_TRIGGERED',
        description: `Rule evaluation triggered - ${evaluationResults.filter(r => r.matched).length} rule(s) matched`,
        user_id: userId
      });

    res.json({
      success: true,
      data: {
        rules_evaluated: rules.length,
        rules_matched: evaluationResults.filter(r => r.matched).length,
        results: evaluationResults
      },
      message: `Rule evaluation completed - ${evaluationResults.filter(r => r.matched).length} rule(s) matched`
    });
  })
);

/**
 * @route   POST /api/workflow/batch-process
 * @desc    Batch process alerts/cases in queue
 * @access  Private (Manager, MLRO)
 */
router.post('/batch-process',
  preventViewOnlyModifications,
  authorize(['manager', 'mlro']),
  [
    body('entity_type').isIn(['alerts', 'cases']).withMessage('Invalid entity type'),
    body('entity_ids').isArray({ min: 1 }).withMessage('Entity IDs array is required'),
    body('action').notEmpty().withMessage('Action is required')
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
    const { entity_type, entity_ids, action, reason } = req.body;

    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    // Process each entity
    for (const entityId of entity_ids) {
      try {
        if (entity_type === 'alerts') {
          // Update alert
          await supabaseAdmin
            .from('kyc_alerts')
            .update({
              status: action,
              resolved_by: userId,
              resolved_at: new Date().toISOString(),
              resolution_notes: reason
            })
            .eq('id', entityId)
            .eq('tenant_id', tenantId);
        } else if (entity_type === 'cases') {
          // Update case
          await supabaseAdmin
            .from('aml_cases')
            .update({
              resolution_status: action,
              action_by: userId,
              last_updated_time: new Date().toISOString()
            })
            .eq('id', entityId)
            .eq('tenant_id', tenantId);
        }

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          entity_id: entityId,
          error: error.message
        });
      }
    }

    // Log the action
    await supabaseAdmin
      .from('analyst_logs')
      .insert({
        tenant_id: tenantId,
        action: 'BATCH_PROCESS',
        description: `Batch processed ${results.processed} ${entity_type} with action: ${action}`,
        user_id: userId
      });

    res.json({
      success: true,
      data: results,
      message: `Batch processing completed - ${results.processed} successful, ${results.failed} failed`
    });
  })
);

/**
 * @route   GET /api/workflow/audit-trail
 * @desc    Get workflow orchestrator audit trail
 * @access  Private (Manager, MLRO)
 */
router.get('/audit-trail',
  authorize(['manager', 'mlro']),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const {
      page = 1,
      limit = 50,
      action_type,
      startDate,
      endDate
    } = req.query;

    let query = supabaseAdmin
      .from('analyst_logs')
      .select('*, users(id, full_name, email)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .in('action', [
        'DUPLICATE_CHECK_TRIGGERED',
        'PEP_SCREENING_TRIGGERED',
        'ID_EXPIRY_CHECK_TRIGGERED',
        'RULE_EVALUATION_TRIGGERED',
        'BATCH_PROCESS'
      ]);

    if (action_type) {
      query = query.eq('action', action_type);
    }

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

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
  })
);

export default router;
