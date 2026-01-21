/**
 * Security Settings JavaScript
 * Handles SSO provider configuration
 */

// Global state
let ssoProviders = [];
let availableProviders = [];
let rolesData = [];
let currentProviderId = null;
let deleteProviderId = null;

// Provider configuration
const providerConfig = {
  google: {
    name: 'Google',
    icon: 'G',
    class: 'provider-google',
    description: 'Sign in with Google Workspace accounts'
  },
  azure_ad: {
    name: 'Microsoft Entra ID',
    icon: 'M',
    class: 'provider-azure',
    description: 'Sign in with Azure AD / Microsoft 365 accounts'
  },
  okta: {
    name: 'Okta',
    icon: 'O',
    class: 'provider-okta',
    description: 'Sign in with Okta identity provider'
  },
  oidc: {
    name: 'Generic OIDC',
    icon: 'ID',
    class: 'provider-oidc',
    description: 'Connect any OpenID Connect provider'
  },
  saml: {
    name: 'SAML 2.0',
    icon: 'S',
    class: 'provider-saml',
    description: 'Connect SAML 2.0 identity providers'
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Setup logout
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('uqudo_token');
    localStorage.removeItem('user_data');
    window.location.href = '/pages/uqudo-sign-in';
  });

  // Set user name
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  document.getElementById('user-name').textContent = userData.fullName || userData.email || 'User';

  // Setup event listeners
  setupEventListeners();

  // Load data
  await loadSSOSettings();
  await loadRoles();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Save SSO provider
  document.getElementById('saveSsoBtn').addEventListener('click', saveSSOProvider);

  // Test SSO connection
  document.getElementById('testSsoBtn').addEventListener('click', testSSOConnection);

  // Delete confirmation
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteProvider);

  // Provider type change handler
  document.getElementById('ssoProviderType')?.addEventListener('change', handleProviderTypeChange);
}

/**
 * Load SSO settings
 */
async function loadSSOSettings() {
  try {
    const response = await api.request('/sso/settings');

    if (response.success) {
      const { ssoEnabled, enforceSsoOnly, enabledProviders, availableProviders: available } = response.data;

      // Update status
      updateSSOStatus(ssoEnabled, enforceSsoOnly, enabledProviders);

      // Store available providers
      availableProviders = available;

      // Load configured providers
      await loadConfiguredProviders();

      // Render available providers
      renderAvailableProviders(available);
    }
  } catch (error) {
    console.error('Error loading SSO settings:', error);
    document.getElementById('ssoStatusText').textContent = 'Error loading SSO settings';
  }
}

/**
 * Update SSO status display
 */
function updateSSOStatus(enabled, enforced, providers) {
  const statusText = document.getElementById('ssoStatusText');
  const badgesContainer = document.getElementById('ssoStatusBadges');

  if (!enabled) {
    statusText.textContent = 'No SSO providers configured. Users authenticate with email and password.';
    badgesContainer.innerHTML = '<span class="status-badge status-disabled">SSO Disabled</span>';
  } else {
    const providerNames = providers.map(p => p.name).join(', ');
    statusText.textContent = `Active providers: ${providerNames}`;

    let badges = '<span class="status-badge status-enabled">SSO Enabled</span>';
    if (enforced) {
      badges += '<span class="status-badge status-primary ms-2">SSO Enforced</span>';
    }
    badgesContainer.innerHTML = badges;
  }
}

/**
 * Load configured SSO providers
 */
async function loadConfiguredProviders() {
  const container = document.getElementById('ssoProvidersContainer');

  try {
    const response = await api.request('/sso/providers');

    if (response.success) {
      ssoProviders = response.data;
      renderConfiguredProviders(response.data);
    }
  } catch (error) {
    console.error('Error loading SSO providers:', error);
    container.innerHTML = `
      <div class="text-center py-4 text-danger">
        Error loading SSO providers. Please try again.
      </div>
    `;
  }
}

/**
 * Render configured SSO providers
 */
function renderConfiguredProviders(providers) {
  const container = document.getElementById('ssoProvidersContainer');

  if (!providers || providers.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-secondary">
        <i class="material-symbols-rounded" style="font-size: 48px;">security</i>
        <p class="mt-2 mb-0">No SSO providers configured yet</p>
        <p class="text-sm">Click on a provider in the right panel to set it up</p>
      </div>
    `;
    return;
  }

  container.innerHTML = providers.map(provider => {
    const config = providerConfig[provider.provider_type] || {};
    const statusClass = provider.is_enabled ? 'enabled' : 'disabled';

    return `
      <div class="provider-card ${statusClass}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="d-flex">
            <div class="provider-logo ${config.class} me-3">
              ${config.icon || provider.provider_type[0].toUpperCase()}
            </div>
            <div>
              <h6 class="mb-1">${escapeHtml(provider.name)}</h6>
              <p class="text-sm text-secondary mb-2">${config.description || provider.provider_type}</p>
              <div class="d-flex gap-2 flex-wrap">
                ${provider.is_enabled ?
                  '<span class="status-badge status-enabled"><i class="material-symbols-rounded text-sm">check</i> Enabled</span>' :
                  '<span class="status-badge status-disabled">Disabled</span>'}
                ${provider.is_primary ? '<span class="status-badge status-primary">Primary</span>' : ''}
                ${provider.enforce_sso_only ? '<span class="status-badge" style="background: #FFF3E0; color: #E65100;">SSO Only</span>' : ''}
              </div>
            </div>
          </div>
          <div class="dropdown">
            <button class="btn btn-link text-secondary mb-0 p-1" type="button" data-bs-toggle="dropdown">
              <i class="material-symbols-rounded">more_vert</i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="#" onclick="openSSOModal('${provider.id}')">
                <i class="material-symbols-rounded me-2">settings</i>Configure
              </a></li>
              <li><a class="dropdown-item" href="#" onclick="testProvider('${provider.id}')">
                <i class="material-symbols-rounded me-2">science</i>Test Connection
              </a></li>
              <li><a class="dropdown-item" href="#" onclick="toggleProvider('${provider.id}', ${!provider.is_enabled})">
                <i class="material-symbols-rounded me-2">${provider.is_enabled ? 'toggle_off' : 'toggle_on'}</i>
                ${provider.is_enabled ? 'Disable' : 'Enable'}
              </a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" href="#" onclick="openDeleteModal('${provider.id}')">
                <i class="material-symbols-rounded me-2">delete</i>Delete
              </a></li>
            </ul>
          </div>
        </div>
        ${provider.last_used_at ? `
          <div class="mt-2 pt-2 border-top">
            <small class="text-muted">Last used: ${formatDate(provider.last_used_at)}</small>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Render available providers for setup
 */
function renderAvailableProviders(providers) {
  const container = document.getElementById('availableProvidersContainer');

  container.innerHTML = providers.map(provider => {
    const config = providerConfig[provider.type] || {};
    const isConfigured = provider.configured;

    return `
      <div class="d-flex align-items-center justify-content-between py-2 ${isConfigured ? '' : 'cursor-pointer'}"
           ${!isConfigured ? `onclick="openSSOModal(null, '${provider.type}')"` : ''}>
        <div class="d-flex align-items-center">
          <div class="provider-logo ${config.class} me-3" style="width: 36px; height: 36px; font-size: 16px;">
            ${config.icon || provider.type[0].toUpperCase()}
          </div>
          <div>
            <h6 class="mb-0 text-sm">${config.name || provider.name}</h6>
            <small class="text-muted">${isConfigured ? 'Configured' : 'Not configured'}</small>
          </div>
        </div>
        ${isConfigured ?
          '<i class="material-symbols-rounded text-success">check_circle</i>' :
          '<button class="btn btn-sm bg-gradient-info mb-0">Setup</button>'}
      </div>
      ${provider.type !== 'saml' ? '<hr class="horizontal dark my-2">' : ''}
    `;
  }).join('');
}

/**
 * Load roles for default role dropdown
 */
async function loadRoles() {
  try {
    const response = await api.request('/roles');
    if (response.success) {
      rolesData = response.data;
      populateRolesDropdown(response.data);
    }
  } catch (error) {
    console.error('Error loading roles:', error);
  }
}

/**
 * Populate roles dropdown
 */
function populateRolesDropdown(roles) {
  const select = document.getElementById('ssoDefaultRole');
  select.innerHTML = '<option value="">Select default role for new users</option>';
  roles.forEach(role => {
    select.innerHTML += `<option value="${role.id}">${escapeHtml(role.name)}</option>`;
  });
}

/**
 * Open SSO configuration modal
 */
window.openSSOModal = async function(providerId = null, providerType = null) {
  const modal = new bootstrap.Modal(document.getElementById('ssoModal'));
  const form = document.getElementById('ssoForm');
  const title = document.getElementById('ssoModalTitle');

  form.reset();
  currentProviderId = providerId;
  document.getElementById('ssoProviderId').value = providerId || '';
  document.getElementById('testResultsSection').style.display = 'none';

  // Generate redirect URI
  const baseUrl = window.location.origin;
  document.getElementById('ssoRedirectUri').value = `${baseUrl}/api/sso/callback`;

  if (providerId) {
    // Edit existing provider
    const provider = ssoProviders.find(p => p.id === providerId);
    if (!provider) return;

    providerType = provider.provider_type;
    const config = providerConfig[providerType] || {};
    title.textContent = `Configure ${config.name || providerType}`;

    document.getElementById('ssoProviderType').value = providerType;
    document.getElementById('ssoName').value = provider.name || '';
    document.getElementById('ssoEnabled').checked = provider.is_enabled || false;
    document.getElementById('ssoPrimary').checked = provider.is_primary || false;
    document.getElementById('ssoEnforceSsoOnly').checked = provider.enforce_sso_only || false;
    document.getElementById('ssoAutoProvision').checked = provider.auto_provision_users !== false;
    document.getElementById('ssoAutoUpdate').checked = provider.auto_update_user_info !== false;

    // Load full provider details
    try {
      const response = await api.request(`/sso/providers/${providerId}`);
      if (response.success) {
        const details = response.data;
        document.getElementById('ssoClientId').value = details.client_id || '';
        document.getElementById('ssoTenantIdAzure').value = details.tenant_id_azure || '';
        document.getElementById('ssoDefaultRole').value = details.default_role_id || '';
        if (details.redirect_uri) {
          document.getElementById('ssoRedirectUri').value = details.redirect_uri;
        }
      }
    } catch (e) {
      console.error('Error loading provider details:', e);
    }
  } else if (providerType) {
    // New provider
    const config = providerConfig[providerType] || {};
    title.textContent = `Setup ${config.name || providerType}`;

    document.getElementById('ssoProviderType').value = providerType;
    document.getElementById('ssoName').value = config.name || '';
    document.getElementById('ssoEnabled').checked = false;
    document.getElementById('ssoPrimary').checked = false;
  }

  // Show/hide Azure-specific fields
  handleProviderTypeChange(providerType);

  modal.show();
};

/**
 * Handle provider type change
 */
function handleProviderTypeChange(providerType) {
  const type = typeof providerType === 'string' ? providerType : document.getElementById('ssoProviderType').value;
  const azureRow = document.getElementById('azureTenantRow');

  if (type === 'azure_ad') {
    azureRow.style.display = 'flex';
  } else {
    azureRow.style.display = 'none';
  }
}

/**
 * Save SSO provider
 */
async function saveSSOProvider() {
  const providerId = document.getElementById('ssoProviderId').value;
  const providerType = document.getElementById('ssoProviderType').value;

  const data = {
    providerType,
    name: document.getElementById('ssoName').value,
    isEnabled: document.getElementById('ssoEnabled').checked,
    isPrimary: document.getElementById('ssoPrimary').checked,
    clientId: document.getElementById('ssoClientId').value,
    redirectUri: document.getElementById('ssoRedirectUri').value,
    enforceSsoOnly: document.getElementById('ssoEnforceSsoOnly').checked,
    autoProvisionUsers: document.getElementById('ssoAutoProvision').checked,
    autoUpdateUserInfo: document.getElementById('ssoAutoUpdate').checked,
    defaultRoleId: document.getElementById('ssoDefaultRole').value || null
  };

  // Add client secret only if provided
  const clientSecret = document.getElementById('ssoClientSecret').value;
  if (clientSecret) {
    data.clientSecret = clientSecret;
  }

  // Add Azure-specific field
  if (providerType === 'azure_ad') {
    data.tenantIdAzure = document.getElementById('ssoTenantIdAzure').value;
  }

  if (!data.name || !data.clientId) {
    showToast('Please fill in required fields', 'error');
    return;
  }

  try {
    let response;
    if (providerId) {
      response = await api.request(`/sso/providers/${providerId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    } else {
      response = await api.request('/sso/providers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }

    if (response.success) {
      showToast(providerId ? 'Provider updated successfully' : 'Provider created successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('ssoModal')).hide();
      await loadSSOSettings();
    } else {
      showToast(response.error || 'Failed to save provider', 'error');
    }
  } catch (error) {
    console.error('Error saving provider:', error);
    showToast('Error saving provider', 'error');
  }
}

/**
 * Test SSO connection
 */
async function testSSOConnection() {
  const providerId = document.getElementById('ssoProviderId').value;
  if (!providerId) {
    showToast('Please save the provider first before testing', 'error');
    return;
  }

  await testProvider(providerId);
}

/**
 * Test provider connection
 */
window.testProvider = async function(providerId) {
  const resultsSection = document.getElementById('testResultsSection');
  const resultsContainer = document.getElementById('testResultsContainer');

  resultsSection.style.display = 'block';
  resultsContainer.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border text-info" role="status">
        <span class="visually-hidden">Testing...</span>
      </div>
      <p class="text-sm mt-2 mb-0">Testing connection...</p>
    </div>
  `;

  try {
    const response = await api.request(`/sso/providers/${providerId}/test`, { method: 'POST' });

    if (response.success) {
      const { overallStatus, tests, testedAt } = response.data;

      resultsContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="status-badge ${overallStatus === 'success' ? 'status-enabled' : overallStatus === 'partial' ? 'test-warn' : 'test-fail'}">
            ${overallStatus === 'success' ? 'All Tests Passed' : overallStatus === 'partial' ? 'Partial Success' : 'Tests Failed'}
          </span>
          <small class="text-muted">Tested: ${formatDate(testedAt)}</small>
        </div>
        ${tests.map(test => `
          <div class="test-result ${test.status === 'pass' ? 'test-pass' : test.status === 'warn' ? 'test-warn' : 'test-fail'}">
            <div class="d-flex justify-content-between align-items-center">
              <span>
                <i class="material-symbols-rounded me-1">${test.status === 'pass' ? 'check_circle' : test.status === 'warn' ? 'warning' : 'error'}</i>
                ${test.name}
              </span>
              <span class="text-sm">${test.status.toUpperCase()}</span>
            </div>
            ${test.details ? `<small class="text-muted d-block mt-1">${JSON.stringify(test.details)}</small>` : ''}
          </div>
        `).join('')}
      `;
    } else {
      resultsContainer.innerHTML = `
        <div class="test-result test-fail">
          <i class="material-symbols-rounded me-1">error</i>
          Test failed: ${response.error || 'Unknown error'}
        </div>
      `;
    }
  } catch (error) {
    console.error('Error testing provider:', error);
    resultsContainer.innerHTML = `
      <div class="test-result test-fail">
        <i class="material-symbols-rounded me-1">error</i>
        Error: ${error.message || 'Connection test failed'}
      </div>
    `;
  }
};

/**
 * Toggle provider enabled/disabled
 */
window.toggleProvider = async function(providerId, enable) {
  try {
    const response = await api.request(`/sso/providers/${providerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled: enable })
    });

    if (response.success) {
      showToast(`Provider ${enable ? 'enabled' : 'disabled'} successfully`, 'success');
      await loadSSOSettings();
    } else {
      showToast(response.error || 'Failed to update provider', 'error');
    }
  } catch (error) {
    console.error('Error toggling provider:', error);
    showToast('Error updating provider', 'error');
  }
};

/**
 * Open delete confirmation modal
 */
window.openDeleteModal = function(providerId) {
  deleteProviderId = providerId;
  const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  modal.show();
};

/**
 * Confirm delete provider
 */
async function confirmDeleteProvider() {
  if (!deleteProviderId) return;

  try {
    const response = await api.request(`/sso/providers/${deleteProviderId}`, {
      method: 'DELETE'
    });

    if (response.success) {
      showToast('Provider deleted successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
      await loadSSOSettings();
    } else {
      showToast(response.error || 'Failed to delete provider', 'error');
    }
  } catch (error) {
    console.error('Error deleting provider:', error);
    showToast('Error deleting provider', 'error');
  }

  deleteProviderId = null;
}

/**
 * Copy to clipboard
 */
window.copyToClipboard = function(elementId) {
  const input = document.getElementById(elementId);
  navigator.clipboard.writeText(input.value).then(() => {
    showToast('Copied to clipboard', 'success');
  }).catch(() => {
    // Fallback
    input.select();
    document.execCommand('copy');
    showToast('Copied to clipboard', 'success');
  });
};

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}
