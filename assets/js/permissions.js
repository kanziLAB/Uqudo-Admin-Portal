/**
 * Frontend Permission Enforcement Utilities
 * Provides client-side permission checking and UI enforcement
 */

class PermissionManager {
  constructor() {
    this.permissions = new Set();
    this.roles = [];
    this.initialized = false;
    this.loadingPromise = null;
  }

  /**
   * Initialize permissions from the API
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._loadPermissions();
    await this.loadingPromise;
  }

  /**
   * Load permissions from API
   * @private
   */
  async _loadPermissions() {
    try {
      const response = await api.request('/permissions/my');

      if (response.success) {
        this.permissions = new Set(response.data.permissionCodes || []);
        this.roles = response.data.roles || [];
        this.initialized = true;

        // Store in sessionStorage for quick access
        sessionStorage.setItem('user_permissions', JSON.stringify(Array.from(this.permissions)));
        sessionStorage.setItem('user_roles', JSON.stringify(this.roles));

        // Apply UI enforcement
        this._enforceUI();
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Try to load from sessionStorage as fallback
      const cached = sessionStorage.getItem('user_permissions');
      if (cached) {
        this.permissions = new Set(JSON.parse(cached));
        this.roles = JSON.parse(sessionStorage.getItem('user_roles') || '[]');
        this.initialized = true;
        this._enforceUI();
      }
    }
  }

  /**
   * Refresh permissions from API
   */
  async refresh() {
    this.initialized = false;
    this.loadingPromise = null;
    await this.init();
  }

  /**
   * Check if user has a specific permission
   * @param {string} permission - Permission code (e.g., 'accounts.view')
   * @returns {boolean}
   */
  has(permission) {
    if (!this.initialized) {
      console.warn('PermissionManager not initialized. Call init() first.');
      return false;
    }
    return this.permissions.has(permission);
  }

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissions - Array of permission codes
   * @returns {boolean}
   */
  hasAny(permissions) {
    return permissions.some(p => this.has(p));
  }

  /**
   * Check if user has all of the specified permissions
   * @param {string[]} permissions - Array of permission codes
   * @returns {boolean}
   */
  hasAll(permissions) {
    return permissions.every(p => this.has(p));
  }

  /**
   * Check if user has a specific role
   * @param {string} roleCode - Role code (e.g., 'super_admin')
   * @returns {boolean}
   */
  hasRole(roleCode) {
    return this.roles.some(r => r.code === roleCode);
  }

  /**
   * Check if user has any of the specified roles
   * @param {string[]} roleCodes - Array of role codes
   * @returns {boolean}
   */
  hasAnyRole(roleCodes) {
    return roleCodes.some(code => this.hasRole(code));
  }

  /**
   * Get all user permissions
   * @returns {string[]}
   */
  getAll() {
    return Array.from(this.permissions);
  }

  /**
   * Get all user roles
   * @returns {Object[]}
   */
  getRoles() {
    return this.roles;
  }

  /**
   * Apply UI enforcement based on permissions
   * @private
   */
  _enforceUI() {
    // Hide elements based on data-permission attribute
    document.querySelectorAll('[data-permission]').forEach(el => {
      const permission = el.dataset.permission;
      if (!this.has(permission)) {
        el.style.display = 'none';
      }
    });

    // Disable elements based on data-permission-disable attribute
    document.querySelectorAll('[data-permission-disable]').forEach(el => {
      const permission = el.dataset.permissionDisable;
      if (!this.has(permission)) {
        el.disabled = true;
        el.classList.add('disabled');
        el.setAttribute('title', 'You do not have permission to perform this action');
      }
    });

    // Hide elements that require any of multiple permissions
    document.querySelectorAll('[data-permission-any]').forEach(el => {
      const permissions = el.dataset.permissionAny.split(',').map(p => p.trim());
      if (!this.hasAny(permissions)) {
        el.style.display = 'none';
      }
    });

    // Hide elements that require all permissions
    document.querySelectorAll('[data-permission-all]').forEach(el => {
      const permissions = el.dataset.permissionAll.split(',').map(p => p.trim());
      if (!this.hasAll(permissions)) {
        el.style.display = 'none';
      }
    });

    // Hide navigation items based on page permissions
    this._enforceNavigation();
  }

  /**
   * Enforce navigation visibility based on page permissions
   * @private
   */
  _enforceNavigation() {
    const pagePermissions = {
      'uqudo-dashboard': 'dashboard.view',
      'accounts': 'accounts.view',
      'alerts': 'alerts.view',
      'cases': 'cases.view',
      'uqudo-analytics': 'analytics.view',
      'kyc-setup': 'kyc_setup.view',
      'blocklist': 'blocklist.view',
      'user-access': 'users.view',
      'security-settings': 'security.view'
    };

    // Hide nav items for pages user can't access
    document.querySelectorAll('.sidenav .nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const page = href.replace('./', '').replace('.html', '').split('/').pop();
      const permission = pagePermissions[page];

      if (permission && !this.has(permission)) {
        const navItem = link.closest('.nav-item');
        if (navItem) {
          navItem.style.display = 'none';
        }
      }
    });

    // Hide administration section if user has no admin permissions
    const adminPermissions = ['users.view', 'roles.view', 'security.view'];
    if (!this.hasAny(adminPermissions)) {
      document.querySelectorAll('.nav-item h6').forEach(header => {
        if (header.textContent.toLowerCase().includes('administration')) {
          header.closest('.nav-item').style.display = 'none';
        }
      });
    }
  }

  /**
   * Protect a page - redirect if user doesn't have permission
   * @param {string} permission - Required permission
   * @param {string} redirectUrl - URL to redirect to (default: dashboard)
   */
  protectPage(permission, redirectUrl = '/pages/uqudo-dashboard') {
    if (!this.has(permission)) {
      console.warn(`Access denied: Missing permission ${permission}`);
      showToast && showToast('You do not have permission to access this page', 'error');
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
      return false;
    }
    return true;
  }

  /**
   * Create a permission-protected click handler
   * @param {string} permission - Required permission
   * @param {Function} handler - Click handler to execute if permitted
   * @returns {Function}
   */
  protectedHandler(permission, handler) {
    return (event) => {
      if (!this.has(permission)) {
        event.preventDefault();
        event.stopPropagation();
        showToast && showToast('You do not have permission to perform this action', 'error');
        return;
      }
      handler(event);
    };
  }

  /**
   * Conditionally render content based on permission
   * @param {string} permission - Required permission
   * @param {string} allowedContent - Content to show if permitted
   * @param {string} deniedContent - Content to show if not permitted (optional)
   * @returns {string}
   */
  renderIf(permission, allowedContent, deniedContent = '') {
    return this.has(permission) ? allowedContent : deniedContent;
  }
}

// Create global instance
const permissionManager = new PermissionManager();

// Auto-initialize when DOM is ready (if api client is available)
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for API client to be available
  if (typeof api !== 'undefined') {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('uqudo_token');
    if (token) {
      try {
        await permissionManager.init();
        console.log('PermissionManager initialized with', permissionManager.getAll().length, 'permissions');
      } catch (e) {
        console.warn('Failed to initialize PermissionManager:', e);
      }
    }
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PermissionManager, permissionManager };
}

/**
 * Usage Examples:
 *
 * // Check permission
 * if (permissionManager.has('accounts.edit')) {
 *   // Show edit button
 * }
 *
 * // Protect page access
 * permissionManager.protectPage('users.view');
 *
 * // Create protected click handler
 * button.onclick = permissionManager.protectedHandler('accounts.delete', () => {
 *   // Delete account
 * });
 *
 * // HTML attributes for automatic enforcement:
 * <button data-permission="accounts.delete">Delete</button>
 * <button data-permission-disable="accounts.edit">Edit</button>
 * <div data-permission-any="cases.view, alerts.view">Visible if user has either permission</div>
 * <div data-permission-all="cases.view, cases.edit">Visible only if user has both permissions</div>
 */
