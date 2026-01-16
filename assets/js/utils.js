/**
 * Uqudo Admin Portal - Utility Functions
 * Common helper functions for the frontend
 */

// ========================================
// AUTHENTICATION
// ========================================

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}

/**
 * Get current user data
 */
function getCurrentUser() {
  const userData = localStorage.getItem('user_data');
  return userData ? JSON.parse(userData) : null;
}

/**
 * Check if user has required role
 */
function hasRole(requiredRoles) {
  const user = getCurrentUser();
  if (!user) return false;

  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }

  return user.role === requiredRoles;
}

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/uqudo-sign-in';
    return false;
  }
  return true;
}

/**
 * Check authentication (alias for requireAuth)
 */
function checkAuth() {
  return requireAuth();
}

// ========================================
// DATE & TIME FORMATTING
// ========================================

/**
 * Format date to localized string
 */
function formatDate(dateString, options = {}) {
  if (!dateString) return 'N/A';

  // If dateStyle is provided, use it directly
  if (options.dateStyle) {
    return new Date(dateString).toLocaleDateString('en-US', { dateStyle: options.dateStyle });
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format datetime to localized string
 */
function formatDateTime(dateString, options = {}) {
  if (!dateString) return 'N/A';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return new Date(dateString).toLocaleString('en-US', defaultOptions);
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
function getRelativeTime(dateString) {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  return formatDate(dateString);
}

// ========================================
// STRING FORMATTING
// ========================================

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert snake_case to Title Case
 */
function snakeToTitle(str) {
  if (!str) return '';
  return str
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Truncate text with ellipsis
 */
function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ========================================
// STATUS & BADGE HELPERS
// ========================================

/**
 * Get badge class for account status
 */
function getAccountStatusBadge(status) {
  const badges = {
    active: 'badge-success',
    suspended: 'badge-warning',
    blocked: 'badge-danger',
    pending: 'badge-secondary'
  };
  return badges[status] || 'badge-secondary';
}

/**
 * Get badge class for alert severity
 */
function getAlertSeverityBadge(severity) {
  const badges = {
    low: 'badge-info',
    medium: 'badge-warning',
    high: 'badge-danger'
  };
  return badges[severity] || 'badge-secondary';
}

/**
 * Get badge class for alert status
 */
function getAlertStatusBadge(status) {
  const badges = {
    pending: 'badge-warning',
    in_review: 'badge-info',
    resolved: 'badge-success'
  };
  return badges[status] || 'badge-secondary';
}

/**
 * Get badge class for case resolution status
 */
function getCaseResolutionBadge(status) {
  const badges = {
    unsolved: 'badge-warning',
    false: 'badge-success',
    positive: 'badge-danger'
  };
  return badges[status] || 'badge-secondary';
}

/**
 * Get badge class for PEP/Sanctions status
 */
function getPEPStatusBadge(status) {
  const badges = {
    clear: 'badge-success',
    positive: 'badge-danger',
    in_process: 'badge-warning'
  };
  return badges[status] || 'badge-secondary';
}

// ========================================
// NOTIFICATIONS
// ========================================

/**
 * Show success toast notification
 */
function showSuccess(message) {
  showToast(message, 'success');
}

/**
 * Show error toast notification
 */
function showError(message) {
  showToast(message, 'danger');
}

/**
 * Show info toast notification
 */
function showInfo(message) {
  showToast(message, 'info');
}

/**
 * Show warning toast notification
 */
function showWarning(message) {
  showToast(message, 'warning');
}

/**
 * Generic toast notification
 */
function showToast(message, type = 'info') {
  // Check if Bootstrap toast container exists
  let toastContainer = document.getElementById('toast-container');

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML('beforeend', toastHTML);

  // Initialize and show toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
  toast.show();

  // Remove toast element after hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// ========================================
// LOADING INDICATORS
// ========================================

/**
 * Show loading spinner
 */
function showLoading(elementId = 'loading-overlay') {
  const overlay = document.getElementById(elementId);
  if (overlay) {
    overlay.classList.remove('d-none');
  }
}

/**
 * Hide loading spinner
 */
function hideLoading(elementId = 'loading-overlay') {
  const overlay = document.getElementById(elementId);
  if (overlay) {
    overlay.classList.add('d-none');
  }
}

/**
 * Show loading in specific element
 */
function showElementLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
  }
}

// ========================================
// CONFIRMATION DIALOGS
// ========================================

/**
 * Show confirmation dialog
 */
function confirmAction(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    // Create modal if not exists
    let modal = document.getElementById('confirm-modal');

    if (!modal) {
      const modalHTML = `
        <div class="modal fade" id="confirm-modal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="confirm-modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body" id="confirm-modal-body"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirm-modal-btn">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      modal = document.getElementById('confirm-modal');
    }

    // Set content
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-body').textContent = message;

    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Handle confirm
    const confirmBtn = document.getElementById('confirm-modal-btn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
      bsModal.hide();
      resolve(true);
    });

    // Handle cancel/close
    modal.addEventListener('hidden.bs.modal', () => {
      resolve(false);
    }, { once: true });
  });
}

// ========================================
// TABLE HELPERS
// ========================================

/**
 * Build pagination HTML
 */
function buildPagination(pagination, onPageChange) {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) return '';

  let html = '<nav><ul class="pagination justify-content-center">';

  // Previous button
  html += `
    <li class="page-item ${page === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
    </li>
  `;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
    if (startPage > 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === page ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
  }

  // Next button
  html += `
    <li class="page-item ${page === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page + 1}">Next</a>
    </li>
  `;

  html += '</ul></nav>';

  return html;
}

/**
 * Attach pagination event listeners
 */
function attachPaginationListeners(containerId, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(e.target.dataset.page);
      if (page && !isNaN(page)) {
        onPageChange(page);
      }
    });
  });
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

/**
 * Download JSON as file
 */
function downloadJSON(data, filename = 'export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Download CSV as file
 */
function downloadCSV(data, filename = 'export.csv') {
  const blob = new Blob([data], { type: 'text/csv' });
  downloadBlob(blob, filename);
}

/**
 * Download blob as file
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========================================
// FORM HELPERS
// ========================================

/**
 * Get form data as object
 */
function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};

  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

/**
 * Reset form
 */
function resetForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();
  }
}

/**
 * Validate form
 */
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return false;
  }

  return true;
}

// ========================================
// DEBOUNCE
// ========================================

/**
 * Debounce function execution
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========================================
// URL HELPERS
// ========================================

/**
 * Get query parameter from URL
 */
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * Update query parameter in URL
 */
function setQueryParam(name, value) {
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

// ========================================
// NUMBER FORMATTING
// ========================================

/**
 * Format number with commas
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format percentage
 */
function formatPercentage(num, decimals = 1) {
  if (num === null || num === undefined) return '0%';
  return num.toFixed(decimals) + '%';
}

// ========================================
// INITIALIZATION
// ========================================

// Check authentication on protected pages
document.addEventListener('DOMContentLoaded', () => {
  // Skip auth check on sign-in page
  if (window.location.pathname.includes('sign-in.html')) {
    return;
  }

  // Require authentication on all other pages
  if (!requireAuth()) {
    return;
  }

  // Display user info in navbar if element exists
  const user = getCurrentUser();
  if (user) {
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');

    if (userNameEl) userNameEl.textContent = user.fullName;
    if (userRoleEl) userRoleEl.textContent = capitalize(user.role.replace('_', ' '));
  }

  // Attach logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (await confirmAction('Are you sure you want to logout?', 'Logout')) {
        await api.logout();
      }
    });
  }
});
