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

/**
 * @route   GET /api/sdk-sessions/device/:deviceIdentifier
 * @desc    Get device history - all sessions and statistics for a specific device
 * @access  Private
 */
router.get('/device/:deviceIdentifier', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { deviceIdentifier } = req.params;
  const { excludeSessionId } = req.query; // Optionally exclude current session

  // Fetch all sessions for this device using the dedicated device_identifier column
  const { data: sessions, error } = await supabaseAdmin
    .from('sdk_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('device_identifier', deviceIdentifier)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching device sessions:', error);
    throw error;
  }

  // Use sessions directly (no need for client-side filtering with dedicated column)
  const filteredSessions = sessions || [];

  // Optionally exclude current session from history
  const historySessions = excludeSessionId
    ? filteredSessions.filter(s => s.id !== excludeSessionId)
    : filteredSessions;

  if (historySessions.length === 0) {
    return res.json({
      success: true,
      data: {
        deviceIdentifier,
        firstSeen: null,
        lastSeen: null,
        totalSessions: 0,
        successfulSessions: 0,
        failedSessions: 0,
        abandonedSessions: 0,
        successRate: 0,
        totalHistoricalFlags: 0,
        documentTypesUsed: [],
        hasRapidRetry: false,
        hasPreviousRejection: false,
        previousSessions: []
      }
    });
  }

  // Calculate statistics
  const totalSessions = historySessions.length;
  const successfulSessions = historySessions.filter(s =>
    s.verification_status === 'APPROVED' || s.verification_status === 'approved'
  ).length;
  const failedSessions = historySessions.filter(s =>
    s.verification_status === 'REJECTED' || s.verification_status === 'rejected' ||
    s.verification_status === 'FAILED' || s.verification_status === 'failed'
  ).length;
  const abandonedSessions = historySessions.filter(s =>
    s.verification_status === 'ABANDONED' || s.verification_status === 'abandoned' ||
    s.verification_status === 'PENDING' || s.verification_status === 'pending' ||
    !s.verification_status
  ).length;

  const successRate = totalSessions > 0 ? successfulSessions / totalSessions : 0;

  // Get first and last seen dates
  const sortedByDate = [...historySessions].sort((a, b) =>
    new Date(a.created_at) - new Date(b.created_at)
  );
  const firstSeen = sortedByDate[0]?.created_at;
  const lastSeen = sortedByDate[sortedByDate.length - 1]?.created_at;

  // Get unique document types used
  const documentTypesUsed = [...new Set(
    historySessions
      .map(s => s.document_type)
      .filter(Boolean)
  )];

  // Check for rapid retry (multiple sessions within 5 minutes)
  let hasRapidRetry = false;
  for (let i = 0; i < sortedByDate.length - 1; i++) {
    const timeDiff = new Date(sortedByDate[i + 1].created_at) - new Date(sortedByDate[i].created_at);
    if (timeDiff < 5 * 60 * 1000) { // 5 minutes
      hasRapidRetry = true;
      break;
    }
  }

  // Check for previous rejections
  const hasPreviousRejection = failedSessions > 0;

  // Count total fraud flags from all sessions
  let totalHistoricalFlags = 0;
  historySessions.forEach(session => {
    if (session.fraud_scores) {
      try {
        const fraudScores = typeof session.fraud_scores === 'string'
          ? JSON.parse(session.fraud_scores)
          : session.fraud_scores;
        // Count flags based on scores exceeding thresholds
        if (fraudScores.idScreenDetection?.score > 50) totalHistoricalFlags++;
        if (fraudScores.idPrintDetection?.score > 50) totalHistoricalFlags++;
        if (fraudScores.idPhotoTamperingDetection?.score > 70) totalHistoricalFlags++;
        if (fraudScores.faceLiveness?.score < 50) totalHistoricalFlags++;
        if (fraudScores.faceMatch?.score < 70) totalHistoricalFlags++;
      } catch (e) {
        // Ignore parse errors
      }
    }
  });

  // Build previous sessions summary (limit to last 10)
  const previousSessions = historySessions.slice(0, 10).map(session => {
    let sdkSource = {};
    try {
      sdkSource = typeof session.sdk_source === 'string'
        ? JSON.parse(session.sdk_source)
        : (session.sdk_source || {});
    } catch (e) {}

    return {
      id: session.id,
      sessionId: session.session_id,
      timestamp: session.created_at,
      outcome: session.verification_status || 'PENDING',
      documentType: session.document_type || 'Unknown',
      platform: sdkSource.devicePlatform || 'Unknown',
      flagCount: 0 // Could calculate per-session if needed
    };
  });

  res.json({
    success: true,
    data: {
      deviceIdentifier,
      firstSeen,
      lastSeen,
      totalSessions,
      successfulSessions,
      failedSessions,
      abandonedSessions,
      successRate,
      totalHistoricalFlags,
      documentTypesUsed,
      hasRapidRetry,
      hasPreviousRejection,
      previousSessions
    }
  });
}));

export default router;
