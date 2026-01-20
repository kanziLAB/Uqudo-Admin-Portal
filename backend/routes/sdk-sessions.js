import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @route   GET /api/sdk-sessions
 * @desc    Get list of SDK sessions with filtering and pagination
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    verificationStatus,
    verificationChannel,
    search,
    sort = 'created_at',
    order = 'desc'
  } = req.query;

  // Build query
  let query = supabaseAdmin
    .from('sdk_sessions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate);
  }

  if (verificationStatus) {
    query = query.eq('verification_status', verificationStatus);
  }

  if (verificationChannel) {
    query = query.eq('verification_channel', verificationChannel);
  }

  // Search by session_id, name, or id_number
  if (search) {
    query = query.or(`session_id.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,id_number.ilike.%${search}%`);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching SDK sessions:', error);
    throw error;
  }

  res.json({
    success: true,
    data: data || [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}));

/**
 * @route   GET /api/sdk-sessions/:id
 * @desc    Get SDK session details by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  // Try to find by UUID first, then by session_id
  let query = supabaseAdmin
    .from('sdk_sessions')
    .select('*')
    .eq('tenant_id', tenantId);

  // Check if id looks like a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    query = query.eq('id', id);
  } else {
    query = query.eq('session_id', id);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      error: 'SDK session not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @route   GET /api/sdk-sessions/account/:accountId
 * @desc    Get all SDK sessions for a specific account
 * @access  Private
 */
router.get('/account/:accountId', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { accountId } = req.params;

  const { data, error } = await supabaseAdmin
    .from('sdk_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching account sessions:', error);
    throw error;
  }

  res.json({
    success: true,
    data: data || []
  });
}));

export default router;
