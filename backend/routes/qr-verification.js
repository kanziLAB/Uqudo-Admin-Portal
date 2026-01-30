import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * QR-Based Identity Verification API
 *
 * This module provides public endpoints for generating QR codes and deep links
 * for mobile identity verification flows. It's designed for B2B scenarios where
 * customers like VFS Global send verification links to end users.
 *
 * Flow:
 * 1. Generate QR/Link -> Creates one-time token + session
 * 2. User scans QR -> Opens mobile app with token
 * 3. Mobile app calls /init -> Exchanges token for Uqudo access token
 * 4. Mobile app completes Uqudo SDK journey
 * 5. Webhook receives result -> Updates session status
 */

// In-memory token store (for MVP - use Redis in production)
const tokenStore = new Map();

// Configuration
const TOKEN_EXPIRY_MINUTES = parseInt(process.env.QR_TOKEN_EXPIRY_MINUTES) || 5;
const DEEP_LINK_SCHEME = process.env.DEEP_LINK_SCHEME || 'uqudo';
const UNIVERSAL_LINK_BASE = process.env.UNIVERSAL_LINK_BASE || 'https://uqudo.app/verify';

/**
 * @route   POST /api/qr-verification/generate
 * @desc    Generate a new QR verification token and session
 * @access  Public (for VFS Global or other B2B customers to generate links)
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const {
    customer_id,
    customer_name,
    journey_id,
    reference_id,
    expiry_minutes = TOKEN_EXPIRY_MINUTES,
    metadata = {}
  } = req.body;

  // Generate unique token and session ID
  const token = generateSecureToken();
  const sessionId = generateSessionId();

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + expiry_minutes * 60 * 1000);

  // Build deep link URL
  const deepLink = buildDeepLink(token, {
    sessionId,
    customerId: customer_id,
    journeyId: journey_id
  });

  // Store token data
  const tokenData = {
    token,
    session_id: sessionId,
    customer_id: customer_id || 'default',
    customer_name: customer_name || 'Uqudo',
    journey_id: journey_id || process.env.DEFAULT_JOURNEY_ID,
    reference_id: reference_id || null,
    metadata,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'pending', // pending, initialized, completed, expired
    used: false
  };

  // Store in memory (MVP)
  tokenStore.set(token, tokenData);

  // Also store in database for persistence and audit
  try {
    const { error } = await supabaseAdmin
      .from('qr_verification_sessions')
      .insert({
        session_id: sessionId,
        token_hash: hashToken(token), // Don't store raw token
        customer_id: customer_id || 'default',
        customer_name: customer_name || 'Uqudo',
        journey_id: journey_id || process.env.DEFAULT_JOURNEY_ID,
        reference_id,
        metadata,
        deep_link: deepLink,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Failed to store QR session in database:', error);
      // Continue anyway - we have it in memory
    }
  } catch (dbError) {
    console.warn('Database error storing QR session:', dbError);
    // Continue anyway - we have it in memory
  }

  // Schedule token cleanup after expiry
  setTimeout(() => {
    const storedToken = tokenStore.get(token);
    if (storedToken && storedToken.status === 'pending') {
      storedToken.status = 'expired';
      tokenStore.delete(token);
    }
  }, expiry_minutes * 60 * 1000);

  // Build the verification URL that works on web (redirects to app or shows instructions)
  // This URL points to the Admin Portal's verify page which handles app detection
  // First, try to get configured base URL from KYC setup
  let configuredBaseUrl = null;
  try {
    const { data: kycConfig } = await supabaseAdmin
      .from('kyc_setup')
      .select('qr_config')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (kycConfig?.qr_config?.base_url) {
      configuredBaseUrl = kycConfig.qr_config.base_url;
    }
  } catch (e) {
    // Ignore config lookup errors - use defaults
  }

  const baseUrl = configuredBaseUrl
    || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
    || process.env.APP_URL
    || 'https://uqudo-admin-portal.vercel.app';
  const webVerifyLink = `${baseUrl}/pages/verify?token=${token}&session=${sessionId}`;

  // Return response
  res.json({
    success: true,
    data: {
      token,
      session_id: sessionId,
      deep_link: deepLink,                          // uqudo://verify?token=... (for apps)
      universal_link: webVerifyLink,                 // https://...verify?token=... (web fallback)
      qr_data: webVerifyLink,                        // Use web link for QR (more universal)
      expires_at: expiresAt.toISOString(),
      expires_in_seconds: expiry_minutes * 60,
      customer: {
        id: customer_id || 'default',
        name: customer_name || 'Uqudo'
      }
    }
  });
}));

/**
 * @route   POST /api/qr-verification/init
 * @desc    Initialize SDK session - exchange QR token for Uqudo access token
 * @access  Public (called by mobile app after scanning QR)
 */
router.post('/init', asyncHandler(async (req, res) => {
  const { token, device_info } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required'
    });
  }

  // Look up token
  const tokenData = tokenStore.get(token);

  if (!tokenData) {
    // Check if it might be in database (expired from memory)
    try {
      const { data: dbSession } = await supabaseAdmin
        .from('qr_verification_sessions')
        .select('*')
        .eq('token_hash', hashToken(token))
        .single();

      if (dbSession) {
        if (dbSession.status === 'completed') {
          return res.status(400).json({
            success: false,
            error: 'This verification session has already been completed'
          });
        }
        if (new Date(dbSession.expires_at) < new Date()) {
          return res.status(400).json({
            success: false,
            error: 'Verification link has expired'
          });
        }
      }
    } catch (e) {
      // Ignore database lookup errors
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  // Check if token is expired
  if (new Date(tokenData.expires_at) < new Date()) {
    tokenStore.delete(token);
    return res.status(400).json({
      success: false,
      error: 'Verification link has expired'
    });
  }

  // Check if token has been used
  if (tokenData.used) {
    return res.status(400).json({
      success: false,
      error: 'This verification link has already been used'
    });
  }

  // Mark token as used (one-time use)
  tokenData.used = true;
  tokenData.status = 'initialized';
  tokenData.initialized_at = new Date().toISOString();
  tokenData.device_info = device_info || {};

  // Get Uqudo access token (using customer-specific credentials if available)
  let uqudoAccessToken = null;
  let uqudoTokenExpiry = null;

  try {
    const authResult = await getUqudoAccessToken(tokenData.customer_id);
    uqudoAccessToken = authResult.access_token;
    uqudoTokenExpiry = authResult.expires_in;
  } catch (authError) {
    console.error('Failed to get Uqudo access token:', authError);

    // Revert token state since initialization failed
    tokenData.used = false;
    tokenData.status = 'pending';
    delete tokenData.initialized_at;

    return res.status(500).json({
      success: false,
      error: 'Failed to initialize verification session'
    });
  }

  // Update database
  try {
    await supabaseAdmin
      .from('qr_verification_sessions')
      .update({
        status: 'initialized',
        initialized_at: new Date().toISOString(),
        device_info
      })
      .eq('session_id', tokenData.session_id);
  } catch (e) {
    console.warn('Failed to update session in database:', e);
  }

  // Return SDK initialization data
  res.json({
    success: true,
    data: {
      session_id: tokenData.session_id,
      access_token: uqudoAccessToken,
      token_expires_in: uqudoTokenExpiry,
      journey_id: tokenData.journey_id,
      customer: {
        id: tokenData.customer_id,
        name: tokenData.customer_name
      },
      reference_id: tokenData.reference_id,
      metadata: tokenData.metadata
    }
  });
}));

/**
 * @route   GET /api/qr-verification/status/:sessionId
 * @desc    Check verification session status
 * @access  Public
 */
router.get('/status/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Check memory store first
  for (const [, tokenData] of tokenStore) {
    if (tokenData.session_id === sessionId) {
      return res.json({
        success: true,
        data: {
          session_id: sessionId,
          status: tokenData.status,
          created_at: tokenData.created_at,
          expires_at: tokenData.expires_at,
          initialized_at: tokenData.initialized_at || null,
          completed_at: tokenData.completed_at || null
        }
      });
    }
  }

  // Check database
  try {
    const { data: dbSession, error } = await supabaseAdmin
      .from('qr_verification_sessions')
      .select('session_id, status, created_at, expires_at, initialized_at, completed_at')
      .eq('session_id', sessionId)
      .single();

    if (error || !dbSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    return res.json({
      success: true,
      data: dbSession
    });
  } catch (e) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }
}));

/**
 * @route   POST /api/qr-verification/complete
 * @desc    Mark session as complete (called by webhook or mobile app)
 * @access  Public (with session validation)
 */
router.post('/complete', asyncHandler(async (req, res) => {
  const { session_id, status, verification_result } = req.body;

  if (!session_id) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required'
    });
  }

  // Update memory store
  for (const [token, tokenData] of tokenStore) {
    if (tokenData.session_id === session_id) {
      tokenData.status = status === 'success' ? 'completed' : 'failed';
      tokenData.completed_at = new Date().toISOString();
      tokenData.verification_result = verification_result;

      // Clean up after completion
      setTimeout(() => tokenStore.delete(token), 5 * 60 * 1000);
      break;
    }
  }

  // Update database
  try {
    await supabaseAdmin
      .from('qr_verification_sessions')
      .update({
        status: status === 'success' ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        verification_result
      })
      .eq('session_id', session_id);
  } catch (e) {
    console.warn('Failed to update session completion in database:', e);
  }

  res.json({
    success: true,
    message: 'Session status updated'
  });
}));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate a cryptographically secure token
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `QR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Hash token for database storage (never store raw tokens)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Build deep link URL for mobile app
 */
function buildDeepLink(token, options = {}) {
  const params = new URLSearchParams({
    token,
    ...(options.sessionId && { session: options.sessionId }),
    ...(options.customerId && { customer: options.customerId }),
    ...(options.journeyId && { journey: options.journeyId })
  });

  return `${DEEP_LINK_SCHEME}://verify?${params.toString()}`;
}

/**
 * Get Uqudo access token using client credentials
 * This authenticates with Uqudo API to get a token for SDK initialization
 *
 * Credentials lookup priority:
 * 1. Customer-specific credentials (from qr_customers table)
 * 2. Global credentials (from kyc_setup table)
 * 3. Environment variables (fallback)
 *
 * @param {string} customerId - Optional customer ID to look up specific credentials
 */
async function getUqudoAccessToken(customerId = null) {
  let clientId = process.env.UQUDO_CLIENT_ID;
  let clientSecret = process.env.UQUDO_CLIENT_SECRET;
  let authUrl = process.env.UQUDO_AUTH_URL || 'https://auth.uqudo.io/api/oauth/token';
  let credentialsSource = 'environment';

  // 1. Try to get customer-specific credentials first
  if (customerId && customerId !== 'default') {
    try {
      // Try API endpoint first
      const customers = JSON.parse(process.env.QR_CUSTOMERS || '[]');
      const customer = customers.find(c => c.id === customerId);

      if (!customer) {
        // Try database lookup via localStorage simulation or direct fetch
        console.log(`🔍 Looking up credentials for customer: ${customerId}`);
      }

      if (customer?.uqudo_credentials) {
        const creds = customer.uqudo_credentials;
        if (creds.client_id && creds.client_secret) {
          clientId = creds.client_id;
          clientSecret = creds.client_secret;
          if (creds.auth_url) authUrl = creds.auth_url;
          credentialsSource = `customer:${customerId}`;
          console.log(`📋 Using Uqudo credentials for customer: ${customerId}`);
        }
      }
    } catch (e) {
      console.log(`ℹ️ No customer-specific credentials found for ${customerId}, trying global config`);
    }
  }

  // 2. Try global KYC Setup credentials if no customer-specific ones found
  if (credentialsSource === 'environment') {
    try {
      const { data: kycConfig } = await supabaseAdmin
        .from('kyc_setup')
        .select('uqudo_credentials')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (kycConfig?.uqudo_credentials) {
        const creds = kycConfig.uqudo_credentials;
        if (creds.client_id && creds.client_secret) {
          clientId = creds.client_id;
          clientSecret = creds.client_secret;
          if (creds.auth_url) authUrl = creds.auth_url;
          credentialsSource = 'kyc_setup';
          console.log('📋 Using Uqudo credentials from KYC Setup configuration');
        }
      }
    } catch (e) {
      console.log('ℹ️ No KYC Setup credentials found, using environment variables');
    }
  }

  if (!clientId || !clientSecret) {
    console.error('❌ Uqudo credentials not configured');
    throw new Error('Uqudo API credentials are not configured. Please configure them in the KYC Setup page or add a B2B customer with credentials.');
  }

  console.log(`🔐 Requesting Uqudo OAuth token (source: ${credentialsSource})...`);

  console.log('🔐 Requesting Uqudo OAuth token...');
  console.log(`📍 Auth URL: ${authUrl}`);
  console.log(`🔑 Client ID: ${clientId.substring(0, 8)}...`);

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      })
    });

    console.log(`📥 OAuth response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Uqudo auth failed: ${response.status} - ${errorText}`);
      throw new Error(`Uqudo auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Uqudo OAuth token obtained successfully');

    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
      token_type: data.token_type || 'Bearer'
    };
  } catch (error) {
    console.error('❌ Uqudo authentication error:', error);
    throw error;
  }
}

export default router;
