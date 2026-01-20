/**
 * Uqudo Admin Portal - API Client
 * Provides a simple interface for making API calls to the backend
 */

class ApiClient {
  constructor(baseURL = null) {
    // Auto-detect API URL based on environment
    if (!baseURL) {
      // Check if running on Vercel or production
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // Production: use same origin for API
        baseURL = `${window.location.origin}/api`;
      } else {
        // Local development: use localhost:3000
        baseURL = 'http://localhost:3000/api';
      }
    }

    this.baseURL = baseURL;
    this.token = this.getToken();
  }

  /**
   * Get token from localStorage
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Set token in localStorage
   */
  setToken(token) {
    localStorage.setItem('auth_token', token);
    this.token = token;
  }

  /**
   * Remove token from localStorage
   */
  removeToken() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    this.token = null;
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired
        if (response.status === 401) {
          this.removeToken();
          window.location.href = '/uqudo-sign-in';
          throw new Error('Session expired. Please login again.');
        }

        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(e => e.msg).join(', ');
          throw new Error(errorMessages || 'Validation failed');
        }

        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ========================================
  // AUTHENTICATION
  // ========================================

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });

    if (data.success) {
      this.setToken(data.data.token);
      localStorage.setItem('refresh_token', data.data.refreshToken);
      localStorage.setItem('user_data', JSON.stringify(data.data.user));
    }

    return data;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      this.removeToken();
      window.location.href = '/pages/sign-in.html';
    }
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  }

  // ========================================
  // DASHBOARD
  // ========================================

  async getKPIs() {
    return this.get('/dashboard/kpis');
  }

  async getVerificationTypeDistribution() {
    return this.get('/dashboard/verification-type-distribution');
  }

  async getAccountStatusDistribution() {
    return this.get('/dashboard/account-status-distribution');
  }

  async getCountryDistribution() {
    return this.get('/dashboard/country-distribution');
  }

  async getNewRegistrations(period = '7d') {
    return this.get('/dashboard/new-registrations', { period });
  }

  async getGrowthRate(period = '30d') {
    return this.get('/dashboard/growth-rate', { period });
  }

  // ========================================
  // SDK SESSIONS
  // ========================================

  async getSdkSessions(params = {}) {
    return this.get('/sdk-sessions', params);
  }

  async getSdkSessionById(id) {
    return this.get(`/sdk-sessions/${id}`);
  }

  async getSdkSessionsByAccount(accountId) {
    return this.get(`/sdk-sessions/account/${accountId}`);
  }

  // ========================================
  // ACCOUNTS
  // ========================================

  async getAccounts(params = {}) {
    return this.get('/accounts', params);
  }

  async getAccountById(id) {
    return this.get(`/accounts/${id}`);
  }

  async updateAccount(id, updates) {
    return this.patch(`/accounts/${id}`, updates);
  }

  async deleteAccount(id) {
    return this.delete(`/accounts/${id}`);
  }

  async getVerificationTickets(accountId) {
    return this.get(`/accounts/${accountId}/verification-tickets`);
  }

  async updateVerificationTicket(accountId, ticketId, updates) {
    return this.patch(`/accounts/${accountId}/verification-tickets/${ticketId}`, updates);
  }

  async getBiometricData(accountId) {
    return this.get(`/accounts/${accountId}/biometric`);
  }

  async getDeviceAttestation(accountId) {
    return this.get(`/accounts/${accountId}/device-attestation`);
  }

  async requestDocuments(accountId, data) {
    return this.post(`/accounts/${accountId}/documents/request`, data);
  }

  async getDocuments(accountId) {
    return this.get(`/accounts/${accountId}/documents`);
  }

  async markDocumentCompliance(accountId, docId, data) {
    return this.patch(`/accounts/${accountId}/documents/${docId}/compliance`, data);
  }

  async getAnalystLogs(accountId, params = {}) {
    return this.get(`/accounts/${accountId}/analyst-logs`, params);
  }

  async createAccount(data) {
    return this.post('/accounts', data);
  }

  async addNote(accountId, description) {
    return this.post(`/accounts/${accountId}/notes`, { description });
  }

  async getAccountBiometricData(accountId) {
    return this.get(`/accounts/${accountId}/biometric-data`);
  }

  async getAccountDeviceAttestation(accountId) {
    return this.get(`/accounts/${accountId}/device-attestation`);
  }

  async getAccountActivityLog(accountId, params = {}) {
    return this.get(`/accounts/${accountId}/activity-log`, params);
  }

  async performAccountAction(accountId, action, reason, notes = '') {
    return this.post(`/accounts/${accountId}/actions`, { action, reason, notes });
  }

  // ========================================
  // ALERTS
  // ========================================

  async getAlerts(params = {}) {
    return this.get('/alerts', params);
  }

  async createAlert(data) {
    return this.post('/alerts', data);
  }

  async getAlertById(id) {
    return this.get(`/alerts/${id}`);
  }

  async updateAlertStatus(id, status) {
    return this.patch(`/alerts/${id}/status`, { status });
  }

  async performAlertAction(id, action, reason = '', notes = '') {
    return this.post(`/alerts/${id}/actions`, { action, reason, notes });
  }

  async assignAlert(id, userId) {
    return this.post(`/alerts/${id}/assign`, { user_id: userId });
  }

  async getAlertQueueSummary() {
    return this.get('/alerts/queue/summary');
  }

  // ========================================
  // CASES
  // ========================================

  async getCases(params = {}) {
    return this.get('/cases', params);
  }

  async createCase(data) {
    return this.post('/cases', data);
  }

  async getCaseById(id) {
    return this.get(`/cases/${id}`);
  }

  async performCaseAction(id, payload) {
    return this.post(`/cases/${id}/actions`, payload);
  }

  async updateCaseStatus(id, resolutionStatus) {
    return this.patch(`/cases/${id}/status`, { resolutionStatus });
  }

  async exportCases() {
    return this.post('/cases/export');
  }

  // ========================================
  // CONFIGURATION - KYC SETUP
  // ========================================

  async getKYCSetup() {
    return this.get('/config/kyc-setup');
  }

  async updateKYCSetup(settings) {
    return this.put('/config/kyc-setup', settings);
  }

  // ========================================
  // CONFIGURATION - BLOCKLIST
  // ========================================

  async getBlocklist(params = {}) {
    return this.get('/config/blocklist', params);
  }

  async getBlocklistEntry(id) {
    return this.get(`/config/blocklist/${id}`);
  }

  async addBlocklistEntry(data) {
    return this.post('/config/blocklist', data);
  }

  async importBlocklist(data) {
    return this.post('/config/blocklist/import', data);
  }

  async updateBlocklistEntry(id, data) {
    return this.put(`/config/blocklist/${id}`, data);
  }

  async deleteBlocklistEntry(id) {
    return this.delete(`/config/blocklist/${id}`);
  }

  async importBlocklist(entries) {
    return this.post('/config/blocklist/import', { entries });
  }

  // ========================================
  // CONFIGURATION - RULES
  // ========================================

  async getRules(params = {}) {
    return this.get('/config/rules', params);
  }

  async getRuleById(id) {
    return this.get(`/config/rules/${id}`);
  }

  async createRule(data) {
    return this.post('/config/rules', data);
  }

  async updateRule(id, data) {
    return this.put(`/config/rules/${id}`, data);
  }

  async deleteRule(id) {
    return this.delete(`/config/rules/${id}`);
  }

  async toggleRule(id) {
    return this.patch(`/config/rules/${id}/toggle`);
  }

  // ========================================
  // CONFIGURATION - COUNTRIES
  // ========================================

  async getCountries(params = {}) {
    return this.get('/config/countries', params);
  }

  async addCountry(data) {
    return this.post('/config/countries', data);
  }

  async updateCountry(id, data) {
    return this.patch(`/config/countries/${id}`, data);
  }

  async deleteCountry(id) {
    return this.delete(`/config/countries/${id}`);
  }

  async bulkUpdateCountries(countryIds, updates) {
    return this.post('/config/countries/bulk-update', {
      country_ids: countryIds,
      updates,
    });
  }

  // ========================================
  // WORKFLOW ORCHESTRATOR
  // ========================================

  async getWorkflowStatus() {
    return this.get('/workflow/status');
  }

  async triggerDuplicateCheck(accountId) {
    return this.post('/workflow/trigger/duplicate-check', { account_id: accountId });
  }

  async triggerPEPScreening(accountId) {
    return this.post('/workflow/trigger/pep-screening', { account_id: accountId });
  }

  async triggerIDExpiryCheck() {
    return this.post('/workflow/trigger/id-expiry-check');
  }

  async triggerRuleEvaluation(accountId, ruleId = null) {
    const body = { account_id: accountId };
    if (ruleId) body.rule_id = ruleId;
    return this.post('/workflow/trigger/rule-evaluation', body);
  }

  async batchProcess(entityType, entityIds, action, reason = '') {
    return this.post('/workflow/batch-process', {
      entity_type: entityType,
      entity_ids: entityIds,
      action,
      reason,
    });
  }

  async getWorkflowAuditTrail(params = {}) {
    return this.get('/workflow/audit-trail', params);
  }

  // ========================================
  // ANALYTICS - SESSION ANALYTICS
  // ========================================

  async getSessionById(sessionId) {
    return this.get(`/analytics/sessions/${sessionId}`);
  }

  async getDeviceHistory(deviceIdentifier) {
    return this.get(`/analytics/devices/${deviceIdentifier}`);
  }

  async getSessionEvents(sessionId) {
    return this.get(`/analytics/sessions/${sessionId}/events`);
  }

  async getSessionVerification(sessionId) {
    return this.get(`/analytics/sessions/${sessionId}/verification`);
  }

  async searchSessions(params = {}) {
    return this.get('/analytics/sessions', params);
  }

  async getAnalyticsSummary(params = {}) {
    return this.get('/analytics/summary', params);
  }
}

// Create global API client instance
const api = new ApiClient();

// Export for use in other modules (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
