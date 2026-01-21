import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorizePermission } from '../middleware/rbac.js';

const router = express.Router();

// Encryption helpers for sensitive data
const ENCRYPTION_KEY = process.env.SSO_ENCRYPTION_KEY || process.env.JWT_SECRET;
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Decryption error:', e);
    return null;
  }
}

/**
 * @route   GET /api/sso/providers
 * @desc    Get list of SSO providers for tenant
 * @access  Private - requires security.view permission
 */
router.get('/providers', authorizePermission('security.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;

  const { data: providers, error } = await supabaseAdmin
    .from('sso_providers')
    .select(`
      id,
      provider_type,
      name,
      is_enabled,
      is_primary,
      redirect_uri,
      enforce_sso_only,
      auto_provision_users,
      auto_update_user_info,
      default_role_id,
      created_at,
      updated_at,
      last_used_at,
      roles:default_role_id (
        id,
        name,
        code
      )
    `)
    .eq('tenant_id', tenantId)
    .order('provider_type', { ascending: true });

  if (error) {
    console.error('Error fetching SSO providers:', error);
    throw error;
  }

  // Don't return sensitive credentials in list view
  res.json({
    success: true,
    data: providers || []
  });
}));

/**
 * @route   GET /api/sso/providers/:id
 * @desc    Get SSO provider details
 * @access  Private - requires sso.configure permission
 */
router.get('/providers/:id', authorizePermission('sso.configure'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data: provider, error } = await supabaseAdmin
    .from('sso_providers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !provider) {
    return res.status(404).json({
      success: false,
      error: 'SSO provider not found'
    });
  }

  // Mask client secret (show only last 4 chars)
  const maskedProvider = {
    ...provider,
    client_secret: provider.client_secret ? `********${decrypt(provider.client_secret)?.slice(-4) || '****'}` : null,
    certificate: provider.certificate ? '********' : null
  };

  res.json({
    success: true,
    data: maskedProvider
  });
}));

/**
 * @route   POST /api/sso/providers
 * @desc    Create a new SSO provider
 * @access  Private - requires sso.configure permission
 */
router.post('/providers', authorizePermission('sso.configure'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const {
    providerType,
    name,
    clientId,
    clientSecret,
    tenantIdAzure,
    discoveryUrl,
    authorizationUrl,
    tokenUrl,
    userinfoUrl,
    jwksUri,
    entityId,
    ssoUrl,
    sloUrl,
    certificate,
    redirectUri,
    postLogoutRedirectUri,
    scopes = ['openid', 'email', 'profile'],
    claimMappings = {},
    defaultRoleId,
    roleMappings = {},
    enforceSsoOnly = false,
    autoProvisionUsers = true,
    autoUpdateUserInfo = true
  } = req.body;

  // Validate required fields
  if (!providerType || !name) {
    return res.status(400).json({
      success: false,
      error: 'Provider type and name are required'
    });
  }

  // Check for existing provider of same type
  const { data: existingProvider } = await supabaseAdmin
    .from('sso_providers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider_type', providerType)
    .single();

  if (existingProvider) {
    return res.status(409).json({
      success: false,
      error: `An SSO provider of type ${providerType} already exists. Please update it instead.`
    });
  }

  // Validate provider-specific required fields
  if (['google', 'azure_ad', 'okta', 'oidc'].includes(providerType)) {
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID is required for OAuth/OIDC providers'
      });
    }
  }

  if (providerType === 'azure_ad' && !tenantIdAzure) {
    return res.status(400).json({
      success: false,
      error: 'Azure AD Tenant ID is required'
    });
  }

  // Set default URLs based on provider type
  let finalAuthUrl = authorizationUrl;
  let finalTokenUrl = tokenUrl;
  let finalUserinfoUrl = userinfoUrl;
  let finalJwksUri = jwksUri;

  if (providerType === 'google') {
    finalAuthUrl = finalAuthUrl || 'https://accounts.google.com/o/oauth2/v2/auth';
    finalTokenUrl = finalTokenUrl || 'https://oauth2.googleapis.com/token';
    finalUserinfoUrl = finalUserinfoUrl || 'https://openidconnect.googleapis.com/v1/userinfo';
    finalJwksUri = finalJwksUri || 'https://www.googleapis.com/oauth2/v3/certs';
  } else if (providerType === 'azure_ad') {
    const azureTenant = tenantIdAzure || 'common';
    finalAuthUrl = finalAuthUrl || `https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0/authorize`;
    finalTokenUrl = finalTokenUrl || `https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0/token`;
    finalUserinfoUrl = finalUserinfoUrl || 'https://graph.microsoft.com/oidc/userinfo';
    finalJwksUri = finalJwksUri || `https://login.microsoftonline.com/${azureTenant}/discovery/v2.0/keys`;
  }

  // Encrypt sensitive data
  const encryptedSecret = clientSecret ? encrypt(clientSecret) : null;
  const encryptedCert = certificate ? encrypt(certificate) : null;

  const { data: newProvider, error } = await supabaseAdmin
    .from('sso_providers')
    .insert({
      tenant_id: tenantId,
      provider_type: providerType,
      name,
      is_enabled: false,
      is_primary: false,
      client_id: clientId,
      client_secret: encryptedSecret,
      tenant_id_azure: tenantIdAzure,
      discovery_url: discoveryUrl,
      authorization_url: finalAuthUrl,
      token_url: finalTokenUrl,
      userinfo_url: finalUserinfoUrl,
      jwks_uri: finalJwksUri,
      entity_id: entityId,
      sso_url: ssoUrl,
      slo_url: sloUrl,
      certificate: encryptedCert,
      redirect_uri: redirectUri,
      post_logout_redirect_uri: postLogoutRedirectUri,
      scopes,
      claim_mappings: claimMappings,
      default_role_id: defaultRoleId,
      role_mappings: roleMappings,
      enforce_sso_only: enforceSsoOnly,
      auto_provision_users: autoProvisionUsers,
      auto_update_user_info: autoUpdateUserInfo,
      created_by: currentUserId
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating SSO provider:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'sso_provider',
      entity_id: newProvider.id,
      action: 'create',
      new_values: { providerType, name },
      performed_by: currentUserId
    });

  res.status(201).json({
    success: true,
    data: {
      id: newProvider.id,
      providerType: newProvider.provider_type,
      name: newProvider.name,
      isEnabled: newProvider.is_enabled
    },
    message: 'SSO provider created successfully'
  });
}));

/**
 * @route   PATCH /api/sso/providers/:id
 * @desc    Update SSO provider configuration
 * @access  Private - requires sso.configure permission
 */
router.patch('/providers/:id', authorizePermission('sso.configure'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id } = req.params;
  const updates = req.body;

  // Get existing provider
  const { data: existingProvider } = await supabaseAdmin
    .from('sso_providers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!existingProvider) {
    return res.status(404).json({
      success: false,
      error: 'SSO provider not found'
    });
  }

  // Build update object
  const updateData = {};

  // Map camelCase to snake_case and handle encryption
  const fieldMapping = {
    name: 'name',
    clientId: 'client_id',
    tenantIdAzure: 'tenant_id_azure',
    discoveryUrl: 'discovery_url',
    authorizationUrl: 'authorization_url',
    tokenUrl: 'token_url',
    userinfoUrl: 'userinfo_url',
    jwksUri: 'jwks_uri',
    entityId: 'entity_id',
    ssoUrl: 'sso_url',
    sloUrl: 'slo_url',
    redirectUri: 'redirect_uri',
    postLogoutRedirectUri: 'post_logout_redirect_uri',
    scopes: 'scopes',
    claimMappings: 'claim_mappings',
    defaultRoleId: 'default_role_id',
    roleMappings: 'role_mappings',
    enforceSsoOnly: 'enforce_sso_only',
    autoProvisionUsers: 'auto_provision_users',
    autoUpdateUserInfo: 'auto_update_user_info',
    isEnabled: 'is_enabled',
    isPrimary: 'is_primary'
  };

  Object.keys(updates).forEach(key => {
    if (fieldMapping[key]) {
      updateData[fieldMapping[key]] = updates[key];
    }
  });

  // Handle client secret separately (encrypt if provided)
  if (updates.clientSecret && updates.clientSecret !== '') {
    updateData.client_secret = encrypt(updates.clientSecret);
  }

  // Handle certificate separately (encrypt if provided)
  if (updates.certificate && updates.certificate !== '') {
    updateData.certificate = encrypt(updates.certificate);
  }

  // If setting as primary, unset other primaries
  if (updates.isPrimary) {
    await supabaseAdmin
      .from('sso_providers')
      .update({ is_primary: false })
      .eq('tenant_id', tenantId)
      .eq('is_primary', true)
      .neq('id', id);
  }

  updateData.updated_at = new Date().toISOString();

  const { data: updatedProvider, error } = await supabaseAdmin
    .from('sso_providers')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating SSO provider:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'sso_provider',
      entity_id: id,
      action: 'update',
      old_values: { name: existingProvider.name, isEnabled: existingProvider.is_enabled },
      new_values: { name: updatedProvider.name, isEnabled: updatedProvider.is_enabled },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    data: {
      id: updatedProvider.id,
      name: updatedProvider.name,
      isEnabled: updatedProvider.is_enabled,
      isPrimary: updatedProvider.is_primary
    },
    message: 'SSO provider updated successfully'
  });
}));

/**
 * @route   DELETE /api/sso/providers/:id
 * @desc    Delete an SSO provider
 * @access  Private - requires sso.configure permission
 */
router.delete('/providers/:id', authorizePermission('sso.configure'), asyncHandler(async (req, res) => {
  const { tenantId, id: currentUserId } = req.user;
  const { id } = req.params;

  // Get provider info
  const { data: provider } = await supabaseAdmin
    .from('sso_providers')
    .select('id, name, provider_type')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!provider) {
    return res.status(404).json({
      success: false,
      error: 'SSO provider not found'
    });
  }

  // Delete SSO sessions first
  await supabaseAdmin
    .from('sso_sessions')
    .delete()
    .eq('provider_id', id);

  // Delete the provider
  const { error } = await supabaseAdmin
    .from('sso_providers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting SSO provider:', error);
    throw error;
  }

  // Log the action
  await supabaseAdmin
    .from('permission_audit_log')
    .insert({
      tenant_id: tenantId,
      entity_type: 'sso_provider',
      entity_id: id,
      action: 'delete',
      old_values: { name: provider.name, providerType: provider.provider_type },
      performed_by: currentUserId
    });

  res.json({
    success: true,
    message: 'SSO provider deleted successfully'
  });
}));

/**
 * @route   POST /api/sso/providers/:id/test
 * @desc    Test SSO provider connection
 * @access  Private - requires sso.test permission
 */
router.post('/providers/:id/test', authorizePermission('sso.test'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const { data: provider } = await supabaseAdmin
    .from('sso_providers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!provider) {
    return res.status(404).json({
      success: false,
      error: 'SSO provider not found'
    });
  }

  const tests = [];

  // Test 1: Check required configuration
  if (['google', 'azure_ad', 'okta', 'oidc'].includes(provider.provider_type)) {
    const hasClientId = !!provider.client_id;
    const hasClientSecret = !!provider.client_secret;
    const hasRedirectUri = !!provider.redirect_uri;

    tests.push({
      name: 'Configuration Check',
      status: hasClientId && hasClientSecret && hasRedirectUri ? 'pass' : 'fail',
      details: {
        clientId: hasClientId ? 'Configured' : 'Missing',
        clientSecret: hasClientSecret ? 'Configured' : 'Missing',
        redirectUri: hasRedirectUri ? 'Configured' : 'Missing'
      }
    });
  }

  // Test 2: Check OAuth endpoints are reachable
  if (provider.authorization_url) {
    try {
      const response = await fetch(provider.authorization_url, { method: 'HEAD' });
      tests.push({
        name: 'Authorization Endpoint',
        status: response.ok || response.status === 302 ? 'pass' : 'warn',
        details: { url: provider.authorization_url, status: response.status }
      });
    } catch (e) {
      tests.push({
        name: 'Authorization Endpoint',
        status: 'fail',
        details: { url: provider.authorization_url, error: e.message }
      });
    }
  }

  // Test 3: Check JWKS endpoint (for token validation)
  if (provider.jwks_uri) {
    try {
      const response = await fetch(provider.jwks_uri);
      const jwks = await response.json();
      tests.push({
        name: 'JWKS Endpoint',
        status: jwks.keys ? 'pass' : 'fail',
        details: {
          url: provider.jwks_uri,
          keyCount: jwks.keys?.length || 0
        }
      });
    } catch (e) {
      tests.push({
        name: 'JWKS Endpoint',
        status: 'fail',
        details: { url: provider.jwks_uri, error: e.message }
      });
    }
  }

  // Overall status
  const failedTests = tests.filter(t => t.status === 'fail').length;
  const overallStatus = failedTests === 0 ? 'success' : failedTests === tests.length ? 'failed' : 'partial';

  res.json({
    success: true,
    data: {
      overallStatus,
      tests,
      testedAt: new Date().toISOString()
    }
  });
}));

/**
 * @route   GET /api/sso/settings
 * @desc    Get tenant SSO settings summary
 * @access  Private - requires security.view permission
 */
router.get('/settings', authorizePermission('security.view'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;

  // Get enabled providers
  const { data: providers } = await supabaseAdmin
    .from('sso_providers')
    .select('id, provider_type, name, is_enabled, is_primary, enforce_sso_only')
    .eq('tenant_id', tenantId);

  const enabledProviders = (providers || []).filter(p => p.is_enabled);
  const primaryProvider = enabledProviders.find(p => p.is_primary);
  const enforceSsoOnly = enabledProviders.some(p => p.enforce_sso_only);

  res.json({
    success: true,
    data: {
      ssoEnabled: enabledProviders.length > 0,
      enforceSsoOnly,
      primaryProvider: primaryProvider ? {
        id: primaryProvider.id,
        type: primaryProvider.provider_type,
        name: primaryProvider.name
      } : null,
      enabledProviders: enabledProviders.map(p => ({
        id: p.id,
        type: p.provider_type,
        name: p.name
      })),
      availableProviders: [
        { type: 'google', name: 'Google OAuth', configured: providers?.some(p => p.provider_type === 'google') },
        { type: 'azure_ad', name: 'Microsoft Entra ID (Azure AD)', configured: providers?.some(p => p.provider_type === 'azure_ad') },
        { type: 'okta', name: 'Okta', configured: providers?.some(p => p.provider_type === 'okta') },
        { type: 'oidc', name: 'Generic OIDC', configured: providers?.some(p => p.provider_type === 'oidc') },
        { type: 'saml', name: 'SAML 2.0', configured: providers?.some(p => p.provider_type === 'saml') }
      ]
    }
  });
}));

/**
 * @route   GET /api/sso/auth/:providerType
 * @desc    Initiate SSO authentication (generates auth URL)
 * @access  Public
 */
router.get('/auth/:providerType', asyncHandler(async (req, res) => {
  const { providerType } = req.params;
  const { tenantDomain } = req.query;

  if (!tenantDomain) {
    return res.status(400).json({
      success: false,
      error: 'Tenant domain is required'
    });
  }

  // Find tenant by domain
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('domain', tenantDomain)
    .single();

  if (!tenant) {
    return res.status(404).json({
      success: false,
      error: 'Tenant not found'
    });
  }

  // Get provider configuration
  const { data: provider } = await supabaseAdmin
    .from('sso_providers')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('provider_type', providerType)
    .eq('is_enabled', true)
    .single();

  if (!provider) {
    return res.status(404).json({
      success: false,
      error: 'SSO provider not found or not enabled'
    });
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: provider.client_id,
    redirect_uri: provider.redirect_uri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state,
    nonce: crypto.randomBytes(16).toString('hex')
  });

  if (providerType === 'azure_ad') {
    params.append('prompt', 'select_account');
  }

  const authUrl = `${provider.authorization_url}?${params.toString()}`;

  res.json({
    success: true,
    data: {
      authUrl,
      state
    }
  });
}));

export default router;
