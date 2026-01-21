/**
 * User Access Management JavaScript
 * Handles users, roles, and permissions management
 */

// Global state
let usersData = [];
let rolesData = [];
let permissionsData = [];
let selectedRoleId = null;
let currentPage = 1;
const pageSize = 10;

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

  // Setup tab navigation
  setupTabs();

  // Setup event listeners
  setupEventListeners();

  // Load initial data
  await loadUsers();
  await loadRoles();
});

/**
 * Setup tab navigation
 */
function setupTabs() {
  const tabs = document.querySelectorAll('#uamTabs .nav-link');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.dataset.tab;

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show corresponding content
      document.querySelectorAll('.tab-content-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(`${tabName}-tab`).classList.add('active');

      // Load data for the tab if needed
      if (tabName === 'permissions') {
        loadPermissionMatrix();
      }
    });
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // User search
  document.getElementById('userSearch').addEventListener('input', debounce(() => {
    currentPage = 1;
    loadUsers();
  }, 300));

  // Filters
  document.getElementById('roleFilter').addEventListener('change', () => {
    currentPage = 1;
    loadUsers();
  });

  document.getElementById('statusFilter').addEventListener('change', () => {
    currentPage = 1;
    loadUsers();
  });

  // Add user button
  document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());

  // Save user button
  document.getElementById('saveUserBtn').addEventListener('click', saveUser);

  // Add role button
  document.getElementById('addRoleBtn').addEventListener('click', () => openRoleModal());

  // Save role button
  document.getElementById('saveRoleBtn').addEventListener('click', saveRole);

  // Role code auto-generation from name
  document.getElementById('roleName').addEventListener('input', (e) => {
    const codeField = document.getElementById('roleCode');
    if (!document.getElementById('roleId').value) {
      codeField.value = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
  });

  // Reset password confirmation
  document.getElementById('confirmResetPasswordBtn').addEventListener('click', resetPassword);
}

/**
 * Load users from API
 */
async function loadUsers() {
  const search = document.getElementById('userSearch').value;
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilter').value;

  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-4">
        <div class="spinner-border text-info" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </td>
    </tr>
  `;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: pageSize
    });
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (status) params.append('status', status);

    const response = await api.request(`/users?${params.toString()}`);

    if (response.success) {
      usersData = response.data;
      renderUsersTable(response.data);
      renderPagination(response.pagination);
    }
  } catch (error) {
    console.error('Error loading users:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-danger">
          Error loading users. Please try again.
        </td>
      </tr>
    `;
  }
}

/**
 * Render users table
 */
function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-secondary">
          No users found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => {
    const initials = getInitials(user.full_name || user.email);
    const avatarColor = stringToColor(user.email);
    const statusClass = user.status === 'active' ? 'status-active' :
                        user.status === 'pending' ? 'status-pending' : 'status-inactive';
    const statusLabel = user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown';
    const lastLogin = user.last_login ? formatDate(user.last_login) : 'Never';

    const rolesHtml = (user.roles || []).map(role => `
      <span class="role-badge" style="background: ${role.color}20; color: ${role.color};">
        <i class="material-symbols-rounded">${role.icon || 'person'}</i>
        ${role.name}
      </span>
    `).join(' ') || '<span class="text-secondary text-sm">No roles</span>';

    return `
      <tr>
        <td>
          <div class="d-flex px-2 py-1">
            <div class="user-avatar me-3" style="background-color: ${avatarColor};">
              ${initials}
            </div>
            <div class="d-flex flex-column justify-content-center">
              <h6 class="mb-0 text-sm">${escapeHtml(user.full_name || 'N/A')}</h6>
              <p class="text-xs text-secondary mb-0">${escapeHtml(user.email)}</p>
            </div>
          </div>
        </td>
        <td>
          <div class="d-flex flex-wrap gap-1">
            ${rolesHtml}
          </div>
        </td>
        <td>
          <p class="text-sm font-weight-bold mb-0">${escapeHtml(user.department || '-')}</p>
        </td>
        <td class="align-middle text-center">
          <span class="status-dot ${statusClass}"></span>
          <span class="text-sm">${statusLabel}</span>
        </td>
        <td class="align-middle text-center">
          <span class="text-sm">${lastLogin}</span>
        </td>
        <td class="align-middle">
          <div class="dropdown">
            <button class="btn btn-link text-secondary mb-0 p-2" type="button" data-bs-toggle="dropdown">
              <i class="material-symbols-rounded">more_vert</i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="#" onclick="openUserModal('${user.id}')">
                <i class="material-symbols-rounded me-2">edit</i>Edit
              </a></li>
              <li><a class="dropdown-item" href="#" onclick="openResetPasswordModal('${user.id}', '${escapeHtml(user.full_name || user.email)}')">
                <i class="material-symbols-rounded me-2">key</i>Reset Password
              </a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" href="#" onclick="deleteUser('${user.id}')">
                <i class="material-symbols-rounded me-2">delete</i>Delete
              </a></li>
            </ul>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render pagination
 */
function renderPagination(pagination) {
  const { page, total, totalPages } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  document.getElementById('usersPaginationInfo').textContent =
    total > 0 ? `Showing ${start}-${end} of ${total} users` : 'No users found';

  const paginationEl = document.getElementById('usersPagination');
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `
    <li class="page-item ${page === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${page - 1})">
        <i class="material-symbols-rounded">chevron_left</i>
      </a>
    </li>
  `;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  startPage = Math.max(1, endPage - maxVisible + 1);

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === page ? 'active' : ''}">
        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
      </li>
    `;
  }

  // Next button
  html += `
    <li class="page-item ${page === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${page + 1})">
        <i class="material-symbols-rounded">chevron_right</i>
      </a>
    </li>
  `;

  paginationEl.innerHTML = html;
}

/**
 * Change page
 */
window.changePage = function(page) {
  currentPage = page;
  loadUsers();
};

/**
 * Load roles from API
 */
async function loadRoles() {
  try {
    const response = await api.request('/roles?includeUserCount=true');

    if (response.success) {
      rolesData = response.data;
      renderRolesList(response.data);
      populateRoleFilter(response.data);
      populateUserRolesCheckboxes(response.data);
    }
  } catch (error) {
    console.error('Error loading roles:', error);
    document.getElementById('rolesListContainer').innerHTML = `
      <div class="text-center py-4 text-danger">
        Error loading roles. Please try again.
      </div>
    `;
  }
}

/**
 * Render roles list
 */
function renderRolesList(roles) {
  const container = document.getElementById('rolesListContainer');

  if (!roles || roles.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-secondary">
        No roles defined yet
      </div>
    `;
    return;
  }

  container.innerHTML = roles.map(role => `
    <div class="role-card ${selectedRoleId === role.id ? 'selected' : ''}"
         onclick="selectRole('${role.id}')" data-role-id="${role.id}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="d-flex align-items-center mb-1">
            <span class="role-badge me-2" style="background: ${role.color}20; color: ${role.color};">
              <i class="material-symbols-rounded">${role.icon || 'person'}</i>
              ${escapeHtml(role.name)}
            </span>
            ${role.is_system ? '<span class="badge bg-secondary ms-1">System</span>' : ''}
            ${role.is_default ? '<span class="badge bg-info ms-1">Default</span>' : ''}
          </div>
          <p class="text-sm text-secondary mb-1">${escapeHtml(role.description || 'No description')}</p>
          <p class="text-xs text-muted mb-0">
            <i class="material-symbols-rounded text-sm me-1">people</i>
            ${role.userCount || 0} users
          </p>
        </div>
        <div class="dropdown" onclick="event.stopPropagation();">
          <button class="btn btn-link text-secondary mb-0 p-1" type="button" data-bs-toggle="dropdown">
            <i class="material-symbols-rounded">more_vert</i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="#" onclick="openRoleModal('${role.id}')">
              <i class="material-symbols-rounded me-2">edit</i>Edit
            </a></li>
            ${!role.is_system ? `
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteRole('${role.id}')">
              <i class="material-symbols-rounded me-2">delete</i>Delete
            </a></li>
            ` : ''}
          </ul>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Select a role to view/edit permissions
 */
window.selectRole = async function(roleId) {
  selectedRoleId = roleId;

  // Update UI
  document.querySelectorAll('.role-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.roleId === roleId);
  });

  // Load role permissions
  await loadRolePermissions(roleId);
};

/**
 * Load role permissions
 */
async function loadRolePermissions(roleId) {
  const container = document.getElementById('rolePermissionsContainer');
  const role = rolesData.find(r => r.id === roleId);

  if (!role) return;

  document.getElementById('roleEditorTitle').textContent = role.name;
  document.getElementById('roleEditorDesc').textContent = role.description || 'Manage permissions for this role';

  container.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-info" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;

  try {
    // Load all permissions grouped by category
    const permResponse = await api.request('/permissions?grouped=true');
    const roleResponse = await api.request(`/roles/${roleId}`);

    if (permResponse.success && roleResponse.success) {
      const allPermissions = permResponse.data;
      const rolePermissions = new Set((roleResponse.data.permissions || []).map(p => p.id));

      renderRolePermissions(allPermissions, rolePermissions, role.is_system);
    }
  } catch (error) {
    console.error('Error loading permissions:', error);
    container.innerHTML = `
      <div class="text-center py-4 text-danger">
        Error loading permissions. Please try again.
      </div>
    `;
  }
}

/**
 * Render role permissions editor
 */
function renderRolePermissions(groupedPermissions, selectedPermissions, isSystemRole) {
  const container = document.getElementById('rolePermissionsContainer');

  container.innerHTML = groupedPermissions.map(group => `
    <div class="permission-group">
      <div class="permission-group-title">
        <div class="form-check">
          <input type="checkbox" class="form-check-input permission-group-toggle"
                 id="group-${group.category}"
                 data-category="${group.category}"
                 ${group.permissions.every(p => selectedPermissions.has(p.id)) ? 'checked' : ''}
                 ${isSystemRole ? 'disabled' : ''}>
          <label class="form-check-label" for="group-${group.category}">
            ${escapeHtml(group.displayName)}
          </label>
        </div>
      </div>
      ${group.permissions.map(perm => `
        <div class="permission-item">
          <div class="form-check">
            <input type="checkbox" class="form-check-input permission-check"
                   id="perm-${perm.id}"
                   data-permission-id="${perm.id}"
                   data-category="${group.category}"
                   ${selectedPermissions.has(perm.id) ? 'checked' : ''}
                   ${isSystemRole ? 'disabled' : ''}>
            <label class="form-check-label" for="perm-${perm.id}">
              <strong>${escapeHtml(perm.name)}</strong>
              <span class="text-muted ms-1">(${perm.code})</span>
            </label>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  // Add save button
  if (!isSystemRole) {
    container.innerHTML += `
      <div class="d-flex justify-content-end mt-3">
        <button class="btn bg-gradient-info" onclick="saveRolePermissions()">
          <i class="material-symbols-rounded me-1">save</i>
          Save Permissions
        </button>
      </div>
    `;

    // Setup group toggle listeners
    document.querySelectorAll('.permission-group-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const category = e.target.dataset.category;
        const checked = e.target.checked;
        document.querySelectorAll(`.permission-check[data-category="${category}"]`).forEach(cb => {
          cb.checked = checked;
        });
      });
    });

    // Setup individual permission listeners
    document.querySelectorAll('.permission-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const category = cb.dataset.category;
        const groupToggle = document.querySelector(`.permission-group-toggle[data-category="${category}"]`);
        const categoryCheckboxes = document.querySelectorAll(`.permission-check[data-category="${category}"]`);
        groupToggle.checked = Array.from(categoryCheckboxes).every(c => c.checked);
      });
    });
  }
}

/**
 * Save role permissions
 */
window.saveRolePermissions = async function() {
  if (!selectedRoleId) return;

  const permissionIds = Array.from(document.querySelectorAll('.permission-check:checked'))
    .map(cb => cb.dataset.permissionId);

  try {
    const response = await api.request(`/roles/${selectedRoleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds })
    });

    if (response.success) {
      showToast('Permissions updated successfully', 'success');
    } else {
      showToast(response.error || 'Failed to update permissions', 'error');
    }
  } catch (error) {
    console.error('Error saving permissions:', error);
    showToast('Error saving permissions', 'error');
  }
};

/**
 * Load permission matrix
 */
async function loadPermissionMatrix() {
  const loader = document.getElementById('matrixLoader');
  const tableContainer = document.getElementById('permissionMatrixTable');

  loader.style.display = 'block';
  tableContainer.style.display = 'none';

  try {
    const response = await api.request('/permissions/matrix');

    if (response.success) {
      renderPermissionMatrix(response.data);
      loader.style.display = 'none';
      tableContainer.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading permission matrix:', error);
    loader.innerHTML = `
      <div class="text-danger">Error loading permission matrix. Please try again.</div>
    `;
  }
}

/**
 * Render permission matrix table
 */
function renderPermissionMatrix(data) {
  const { roles, permissionsByCategory, matrix } = data;
  const container = document.getElementById('permissionMatrixTable');

  let html = `
    <table class="table table-bordered table-sm">
      <thead>
        <tr>
          <th style="min-width: 200px;">Permission</th>
          ${roles.map(role => `
            <th class="text-center" style="min-width: 100px;">
              <span class="role-badge" style="background: ${role.color}20; color: ${role.color};">
                ${escapeHtml(role.name)}
              </span>
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  Object.keys(permissionsByCategory).forEach(category => {
    const permissions = permissionsByCategory[category];
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

    html += `
      <tr class="category-header">
        <td colspan="${roles.length + 1}">${categoryName}</td>
      </tr>
    `;

    permissions.forEach(perm => {
      html += `
        <tr>
          <td>
            <span class="text-sm">${escapeHtml(perm.name)}</span>
            <br>
            <small class="text-muted">${perm.code}</small>
          </td>
          ${roles.map(role => {
            const hasPermission = matrix[role.id]?.[perm.id] === 'allow';
            return `
              <td class="text-center">
                ${hasPermission ?
                  '<i class="material-symbols-rounded text-success">check_circle</i>' :
                  '<i class="material-symbols-rounded text-secondary opacity-5">remove</i>'}
              </td>
            `;
          }).join('')}
        </tr>
      `;
    });
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

/**
 * Populate role filter dropdown
 */
function populateRoleFilter(roles) {
  const select = document.getElementById('roleFilter');
  select.innerHTML = '<option value="">All Roles</option>';
  roles.forEach(role => {
    select.innerHTML += `<option value="${role.code}">${escapeHtml(role.name)}</option>`;
  });
}

/**
 * Populate user roles checkboxes
 */
function populateUserRolesCheckboxes(roles) {
  const container = document.getElementById('userRolesCheckboxes');
  container.innerHTML = roles.map(role => `
    <div class="form-check">
      <input class="form-check-input" type="checkbox" value="${role.id}" id="role-check-${role.id}">
      <label class="form-check-label" for="role-check-${role.id}">
        <span class="role-badge" style="background: ${role.color}20; color: ${role.color};">
          <i class="material-symbols-rounded">${role.icon || 'person'}</i>
          ${escapeHtml(role.name)}
        </span>
      </label>
    </div>
  `).join('');
}

/**
 * Open user modal for add/edit
 */
window.openUserModal = async function(userId = null) {
  const modal = new bootstrap.Modal(document.getElementById('userModal'));
  const form = document.getElementById('userForm');
  const title = document.getElementById('userModalTitle');
  const passwordSection = document.getElementById('passwordSection');

  form.reset();
  document.getElementById('userId').value = '';

  // Reset role checkboxes
  document.querySelectorAll('#userRolesCheckboxes input').forEach(cb => cb.checked = false);

  if (userId) {
    title.textContent = 'Edit User';
    passwordSection.style.display = 'none';
    document.getElementById('userPassword').required = false;

    try {
      const response = await api.request(`/users/${userId}`);
      if (response.success) {
        const user = response.data;
        document.getElementById('userId').value = user.id;
        document.getElementById('userFullName').value = user.full_name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userDepartment').value = user.department || '';
        document.getElementById('userStatus').value = user.status || 'active';

        // Check assigned roles
        (user.roles || []).forEach(role => {
          const checkbox = document.getElementById(`role-check-${role.id}`);
          if (checkbox) checkbox.checked = true;
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      showToast('Error loading user data', 'error');
      return;
    }
  } else {
    title.textContent = 'Add User';
    passwordSection.style.display = 'block';
    document.getElementById('userPassword').required = true;
  }

  modal.show();
};

/**
 * Save user
 */
async function saveUser() {
  const userId = document.getElementById('userId').value;
  const fullName = document.getElementById('userFullName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const department = document.getElementById('userDepartment').value;
  const status = document.getElementById('userStatus').value;

  // Get selected roles
  const roleIds = Array.from(document.querySelectorAll('#userRolesCheckboxes input:checked'))
    .map(cb => cb.value);

  if (!fullName || !email) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  if (!userId && (!password || password.length < 8)) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  try {
    let response;
    if (userId) {
      // Update user
      response = await api.request(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fullName, department, status })
      });

      // Update roles separately
      if (response.success && roleIds.length > 0) {
        await api.request(`/users/${userId}/roles`, {
          method: 'POST',
          body: JSON.stringify({ roleIds })
        });
      }
    } else {
      // Create user
      response = await api.request('/users', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password, department, roleIds })
      });
    }

    if (response.success) {
      showToast(userId ? 'User updated successfully' : 'User created successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
      loadUsers();
    } else {
      showToast(response.error || 'Failed to save user', 'error');
    }
  } catch (error) {
    console.error('Error saving user:', error);
    showToast('Error saving user', 'error');
  }
}

/**
 * Delete user
 */
window.deleteUser = async function(userId) {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await api.request(`/users/${userId}`, { method: 'DELETE' });

    if (response.success) {
      showToast('User deleted successfully', 'success');
      loadUsers();
    } else {
      showToast(response.error || 'Failed to delete user', 'error');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Error deleting user', 'error');
  }
};

/**
 * Open reset password modal
 */
window.openResetPasswordModal = function(userId, userName) {
  document.getElementById('resetPasswordUserId').value = userId;
  document.getElementById('resetPasswordUserName').textContent = userName;
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';

  const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
  modal.show();
};

/**
 * Reset password
 */
async function resetPassword() {
  const userId = document.getElementById('resetPasswordUserId').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!newPassword || newPassword.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  try {
    const response = await api.request(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });

    if (response.success) {
      showToast('Password reset successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal')).hide();
    } else {
      showToast(response.error || 'Failed to reset password', 'error');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    showToast('Error resetting password', 'error');
  }
}

/**
 * Open role modal for add/edit
 */
window.openRoleModal = async function(roleId = null) {
  const modal = new bootstrap.Modal(document.getElementById('roleModal'));
  const form = document.getElementById('roleForm');
  const title = document.getElementById('roleModalTitle');

  form.reset();
  document.getElementById('roleId').value = '';
  document.getElementById('roleColor').value = '#6c757d';
  document.getElementById('rolePriority').value = '0';

  if (roleId) {
    title.textContent = 'Edit Role';

    const role = rolesData.find(r => r.id === roleId);
    if (role) {
      document.getElementById('roleId').value = role.id;
      document.getElementById('roleName').value = role.name || '';
      document.getElementById('roleCode').value = role.code || '';
      document.getElementById('roleDescription').value = role.description || '';
      document.getElementById('roleColor').value = role.color || '#6c757d';
      document.getElementById('rolePriority').value = role.priority || 0;
      document.getElementById('roleIsDefault').checked = role.is_default || false;

      // Disable code field for existing roles
      document.getElementById('roleCode').disabled = true;
    }
  } else {
    title.textContent = 'Add Role';
    document.getElementById('roleCode').disabled = false;
  }

  modal.show();
};

/**
 * Save role
 */
async function saveRole() {
  const roleId = document.getElementById('roleId').value;
  const name = document.getElementById('roleName').value.trim();
  const code = document.getElementById('roleCode').value.trim();
  const description = document.getElementById('roleDescription').value.trim();
  const color = document.getElementById('roleColor').value;
  const priority = parseInt(document.getElementById('rolePriority').value) || 0;
  const isDefault = document.getElementById('roleIsDefault').checked;

  if (!name || !code) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  try {
    let response;
    if (roleId) {
      response = await api.request(`/roles/${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description, color, priority, isDefault })
      });
    } else {
      response = await api.request('/roles', {
        method: 'POST',
        body: JSON.stringify({ name, code, description, color, priority, isDefault })
      });
    }

    if (response.success) {
      showToast(roleId ? 'Role updated successfully' : 'Role created successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('roleModal')).hide();
      loadRoles();
    } else {
      showToast(response.error || 'Failed to save role', 'error');
    }
  } catch (error) {
    console.error('Error saving role:', error);
    showToast('Error saving role', 'error');
  }
}

/**
 * Delete role
 */
window.deleteRole = async function(roleId) {
  if (!confirm('Are you sure you want to delete this role? Users assigned to this role will need to be reassigned.')) {
    return;
  }

  try {
    const response = await api.request(`/roles/${roleId}`, { method: 'DELETE' });

    if (response.success) {
      showToast('Role deleted successfully', 'success');
      if (selectedRoleId === roleId) {
        selectedRoleId = null;
        document.getElementById('rolePermissionsContainer').innerHTML = `
          <div class="text-center py-5 text-secondary">
            <i class="material-symbols-rounded" style="font-size: 48px;">touch_app</i>
            <p class="mt-2 mb-0">Select a role from the list to manage its permissions</p>
          </div>
        `;
        document.getElementById('roleEditorTitle').textContent = 'Select a Role';
        document.getElementById('roleEditorDesc').textContent = 'Click on a role to view and edit its permissions';
      }
      loadRoles();
    } else {
      showToast(response.error || 'Failed to delete role', 'error');
    }
  } catch (error) {
    console.error('Error deleting role:', error);
    showToast('Error deleting role', 'error');
  }
};

// Utility functions
function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#1e88e5', '#43a047', '#e53935', '#fb8c00', '#8e24aa', '#00acc1', '#3949ab'];
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
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

function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
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
