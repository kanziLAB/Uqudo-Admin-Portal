// Uqudo Analytics Dashboard
// SDK Analytics capabilities demonstration

let currentSessionData = null;
let currentVerificationData = null;
let currentEventsData = [];
let currentDeviceHistory = null;

// Severity Mapping for Fraud Flags
const SEVERITY_MAP = {
  // CRITICAL
  'FACE_LIVENESS_FAILED': 'CRITICAL',
  'FACE_NO_MATCH': 'CRITICAL',
  'SCAN_DOCUMENT_ID_PHOTO_TAMPERING_DETECTED': 'CRITICAL',
  // HIGH
  'SCAN_DOCUMENT_SCREEN_DETECTED': 'HIGH',
  'SCAN_DOCUMENT_PRINT_DETECTED': 'HIGH',
  'SCAN_DOCUMENT_FRONT_BACK_MISMATCH': 'HIGH',
  'READ_AUTHENTICATION_FAILED': 'HIGH',
  'FACE_MULTIPLE_FACES_DETECTED': 'HIGH',
  'FACE_RECOGNITION_TOO_MANY_ATTEMPTS': 'HIGH',
  'READ_DOCUMENT_VALIDATION_FAILED': 'HIGH',
  // MEDIUM
  'SCAN_DOCUMENT_EXPIRED': 'MEDIUM',
  'SCAN_DOCUMENT_NOT_RECOGNIZED': 'MEDIUM',
  'SCAN_DOCUMENT_INCORRECT_TYPE_DETECTED': 'MEDIUM',
  'FACE_TIMEOUT': 'MEDIUM'
};

// Get severity for a status code
function getSeverity(statusCode) {
  return SEVERITY_MAP[statusCode] || 'LOW';
}

// Search for session
document.getElementById('search-session-btn').addEventListener('click', async () => {
  const sessionId = document.getElementById('session-search-input').value.trim();
  if (!sessionId) {
    showError('Please enter a Session ID');
    return;
  }

  await loadSessionData(sessionId);
});

// Allow Enter key to search
document.getElementById('session-search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('search-session-btn').click();
  }
});

// Load session data
async function loadSessionData(sessionId) {
  try {
    showLoading();

    // Fetch session data from API (placeholder - adjust endpoint as needed)
    const response = await api.getSessionById(sessionId);

    if (!response.success) {
      hideLoading();
      showError('Session not found');
      return;
    }

    currentSessionData = response.data;
    currentVerificationData = response.data.verification_results || {};
    currentEventsData = response.data.events || [];

    // Fetch device history
    if (currentSessionData.deviceIdentifier) {
      const deviceResponse = await api.getDeviceHistory(currentSessionData.deviceIdentifier);
      if (deviceResponse.success) {
        currentDeviceHistory = deviceResponse.data;
      }
    }

    hideLoading();

    // Display session data
    displaySessionHeader();
    displayVerificationSummary();
    displayFraudFlags();
    displayDeviceHistory();
    displayUXAnalysis();

    // Show tabs
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('session-header').style.display = 'block';
    document.getElementById('tabs-container').style.display = 'block';

  } catch (error) {
    hideLoading();
    console.error('Error loading session:', error);
    showError('Error loading session data');
  }
}

// Display Session Header
function displaySessionHeader() {
  const session = currentSessionData;

  // Session ID
  document.getElementById('session-id-display').textContent = truncateId(session.sessionId || session.id);
  document.getElementById('session-id').value = session.sessionId || session.id;

  // Device ID
  document.getElementById('device-id-display').textContent = truncateId(session.deviceIdentifier);
  document.getElementById('device-id').value = session.deviceIdentifier;

  // Document Type
  const docType = currentVerificationData.documentType || session.documentType || 'Unknown';
  document.getElementById('document-type-badge').textContent = formatDocumentType(docType);

  // Outcome
  const outcome = determineOutcome(session, currentEventsData);
  const outcomeBadge = document.getElementById('outcome-badge');
  outcomeBadge.textContent = outcome;
  outcomeBadge.className = `badge badge-outcome-${outcome.toLowerCase()} mt-1`;

  // Risk Assessment
  const riskAssessment = calculateRiskAssessment();
  const riskBadge = document.getElementById('risk-badge');
  riskBadge.textContent = riskAssessment;
  riskBadge.className = `badge badge-risk-${riskAssessment.toLowerCase()} mt-1`;

  // Duration
  const duration = calculateSessionDuration(currentEventsData);
  document.getElementById('duration-display').textContent = formatDuration(duration);

  // Platform
  const platform = session.platform || session.devicePlatform || 'Unknown';
  document.getElementById('platform-badge').textContent = platform;

  // Timestamp
  const timestamp = new Date(session.created_at || session.timestamp);
  document.getElementById('timestamp-display').textContent = formatDateTime(timestamp);
}

// Determine session outcome
function determineOutcome(session, events) {
  if (session.outcome) return session.outcome.toUpperCase();

  const hasCompleteEvent = events.some(e => e.page === 'FINISH' && e.status === 'SUCCESS');
  const hasFailureEvent = events.some(e => e.status === 'FAILURE');

  if (hasCompleteEvent) return 'SUCCESS';
  if (hasFailureEvent) return 'FAILED';
  return 'ABANDONED';
}

// Calculate session duration
function calculateSessionDuration(events) {
  if (!events || events.length === 0) return 0;

  const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const firstEvent = new Date(sortedEvents[0].timestamp);
  const lastEvent = new Date(sortedEvents[sortedEvents.length - 1].timestamp);

  return Math.floor((lastEvent - firstEvent) / 1000); // seconds
}

// Format duration in MM:SS
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Truncate ID for display
function truncateId(id) {
  if (!id) return '-';
  return id.length > 12 ? id.substring(0, 12) + '...' : id;
}

// Format document type
function formatDocumentType(type) {
  return type.replace(/_/g, ' ').replace(/ID$/, ' ID');
}

// Copy to clipboard
function copyToClipboard(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  navigator.clipboard.writeText(input.value).then(() => {
    showSuccess('Copied to clipboard');
  });
}

// Calculate Risk Assessment
function calculateRiskAssessment() {
  const totalRisk = calculateTotalRiskScore();

  if (totalRisk >= 200) return 'REJECT';
  if (totalRisk >= 50) return 'REVIEW';
  return 'APPROVE';
}

// Calculate Total Risk Score
function calculateTotalRiskScore() {
  const journeyRisk = calculateJourneyRiskScore();
  const verificationRisk = calculateVerificationRiskScore();
  const deviceRisk = calculateDeviceRiskScore(currentDeviceHistory);

  return journeyRisk + verificationRisk + deviceRisk;
}

// Calculate Journey Risk Score
function calculateJourneyRiskScore() {
  let score = 0;

  currentEventsData.forEach(event => {
    if (event.status === 'FAILURE') {
      const severity = getSeverity(event.statusCode);
      if (severity === 'CRITICAL') score += 100;
      if (severity === 'HIGH') score += 50;
      if (severity === 'MEDIUM') score += 10;
    }
  });

  return score;
}

// Calculate Verification Risk Score
function calculateVerificationRiskScore() {
  let score = 0;
  const verification = currentVerificationData;

  if (!verification || !verification.verifications) return 0;

  const verif = verification.verifications[0] || {};

  // Photo Tampering
  if (verif.idPhotoTamperingDetection?.score > 40) {
    score += 80;
  }

  // Screen Detection
  if (verif.idScreenDetection?.score > 30) {
    score += 40;
  }

  // Print Detection
  if (verif.idPrintDetection?.score > 30) {
    score += 40;
  }

  // Biometric Match
  if (verif.biometric?.matchLevel < 3) {
    score += 60;
  }

  // MRZ Checksum
  if (verif.mrzChecksum && !verif.mrzChecksum.valid) {
    score += 40;
  }

  // Optimal Resolution
  if (verif.sourceDetection && !verif.sourceDetection.optimalResolution) {
    score += 20;
  }

  // Data Consistency
  if (verif.dataConsistencyCheck && verif.dataConsistencyCheck.fields) {
    verif.dataConsistencyCheck.fields.forEach(field => {
      if (field.match === 'NO_MATCH') {
        score += 50;
      }
    });
  }

  return score;
}

// Calculate Device Risk Score
function calculateDeviceRiskScore(deviceHistory) {
  if (!deviceHistory) return 0;

  let score = 0;

  if (deviceHistory.totalSessions > 2) score += 30;
  if (deviceHistory.successRate < 0.5) score += 40;
  if (deviceHistory.documentTypesUsed && deviceHistory.documentTypesUsed.length > 1) score += 50;
  if (deviceHistory.hasRapidRetry) score += 30;
  score += Math.floor((deviceHistory.totalHistoricalFlags || 0) / 5) * 20;
  if (deviceHistory.hasPreviousRejection) score += 50;

  return score;
}

// Display Verification Summary (Tab 1)
function displayVerificationSummary() {
  const verification = currentVerificationData;
  if (!verification || !verification.verifications) {
    document.getElementById('document-verification-panel').innerHTML = '<p class="text-muted">No verification data available</p>';
    return;
  }

  const verif = verification.verifications[0] || {};

  // Document Verification Panel
  let docHtml = '';

  // Screen Detection
  if (verif.idScreenDetection) {
    const score = verif.idScreenDetection.score || 0;
    const status = score > 50 ? 'fail' : 'pass';
    docHtml += createScoreCard('Screen Detection', score, 100, status);
  }

  // Print Detection
  if (verif.idPrintDetection) {
    const score = verif.idPrintDetection.score || 0;
    const status = score > 50 ? 'fail' : 'pass';
    docHtml += createScoreCard('Print Detection', score, 100, status);
  }

  // Photo Tampering
  if (verif.idPhotoTamperingDetection) {
    const score = verif.idPhotoTamperingDetection.score || 0;
    const status = score > 70 ? 'fail' : score > 40 ? 'warn' : 'pass';
    docHtml += createScoreCard('Photo Tampering', score, 100, status);
  }

  // Optimal Resolution
  if (verif.sourceDetection) {
    const optimal = verif.sourceDetection.optimalResolution;
    const status = optimal ? 'pass' : 'warn';
    docHtml += createBooleanCard('Optimal Resolution', optimal, status);
  }

  // MRZ Checksum
  if (verif.mrzChecksum) {
    const valid = verif.mrzChecksum.valid;
    const status = valid ? 'pass' : 'fail';
    docHtml += createBooleanCard('MRZ Checksum', valid, status);
  }

  // Data Consistency
  if (verif.dataConsistencyCheck && verif.dataConsistencyCheck.fields) {
    const allMatch = verif.dataConsistencyCheck.fields.every(f => f.match === 'MATCH');
    const status = allMatch ? 'pass' : 'fail';
    docHtml += createDataConsistencyCard(verif.dataConsistencyCheck.fields, status);
  }

  document.getElementById('document-verification-panel').innerHTML = docHtml || '<p class="text-muted">No document verification data</p>';

  // Biometric Panel
  let bioHtml = '';

  if (verif.biometric) {
    const matchLevel = verif.biometric.matchLevel || 0;
    const status = matchLevel < 3 ? 'fail' : 'pass';
    bioHtml += `
      <div class="score-card score-${status}">
        <div class="d-flex justify-content-between align-items-center">
          <span>Face Match Level</span>
          <span class="font-weight-bold">${matchLevel}/5</span>
        </div>
        <div class="progress mt-2" style="height: 8px;">
          <div class="progress-bar bg-${status === 'pass' ? 'success' : 'danger'}" style="width: ${matchLevel * 20}%"></div>
        </div>
      </div>
    `;
  }

  // Liveness Check
  const hasLivenessFailed = currentEventsData.some(e => e.statusCode === 'FACE_LIVENESS_FAILED');
  const livenessStatus = hasLivenessFailed ? 'fail' : 'pass';
  bioHtml += createBooleanCard('Liveness Check', !hasLivenessFailed, livenessStatus);

  document.getElementById('biometric-panel').innerHTML = bioHtml || '<p class="text-muted">No biometric data</p>';

  // Chip Reading Panel
  const hasNFC = currentEventsData.some(e => e.page === 'READ' || e.page === 'NFC');
  if (hasNFC && verif.reading) {
    document.getElementById('chip-reading-card').style.display = 'block';

    let chipHtml = '';

    if (verif.reading.passiveAuthentication) {
      chipHtml += createBooleanCard('Passive Auth Enabled', verif.reading.passiveAuthentication.enabled, 'pass');
      chipHtml += createBooleanCard('Document Signature Valid', verif.reading.passiveAuthentication.documentDataSignatureValid, verif.reading.passiveAuthentication.documentDataSignatureValid ? 'pass' : 'fail');
    }

    if (verif.reading.chipAuthentication) {
      chipHtml += createBooleanCard('Chip Auth Enabled', verif.reading.chipAuthentication.enabled, 'pass');
    }

    document.getElementById('chip-reading-panel').innerHTML = chipHtml || '<p class="text-muted">No chip reading data</p>';
  }
}

// Create score card HTML
function createScoreCard(label, score, max, status) {
  return `
    <div class="score-card score-${status}">
      <div class="d-flex justify-content-between align-items-center">
        <span>${label}</span>
        <span class="font-weight-bold">${score}/${max}</span>
      </div>
      <div class="progress mt-2" style="height: 8px;">
        <div class="progress-bar bg-${status === 'pass' ? 'success' : status === 'warn' ? 'warning' : 'danger'}" style="width: ${(score / max) * 100}%"></div>
      </div>
      <small class="text-muted">${status.toUpperCase()}</small>
    </div>
  `;
}

// Create boolean card HTML
function createBooleanCard(label, value, status) {
  return `
    <div class="score-card score-${status}">
      <div class="d-flex justify-content-between align-items-center">
        <span>${label}</span>
        <span class="badge badge-${value ? 'success' : 'danger'}">${value ? 'YES' : 'NO'}</span>
      </div>
    </div>
  `;
}

// Create data consistency card
function createDataConsistencyCard(fields, status) {
  const fieldList = fields.map(f => `
    <div class="d-flex justify-content-between align-items-center mb-1">
      <small>${f.name}</small>
      <span class="badge badge-sm badge-${f.match === 'MATCH' ? 'success' : 'danger'}">${f.match}</span>
    </div>
  `).join('');

  return `
    <div class="score-card score-${status}">
      <div class="mb-2">
        <span class="font-weight-bold">Data Consistency</span>
      </div>
      ${fieldList}
    </div>
  `;
}

// Display Fraud Flags (Tab 2)
function displayFraudFlags() {
  const failureEvents = currentEventsData.filter(e => e.status === 'FAILURE');

  // Group by status code
  const flagGroups = {};
  failureEvents.forEach(event => {
    const code = event.statusCode || 'UNKNOWN';
    if (!flagGroups[code]) {
      flagGroups[code] = {
        code,
        count: 0,
        severity: getSeverity(code),
        timestamps: []
      };
    }
    flagGroups[code].count++;
    flagGroups[code].timestamps.push(event.timestamp);
  });

  // Count by severity
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;

  Object.values(flagGroups).forEach(group => {
    if (group.severity === 'CRITICAL') criticalCount += group.count;
    if (group.severity === 'HIGH') highCount += group.count;
    if (group.severity === 'MEDIUM') mediumCount += group.count;
  });

  // Update count cards
  document.getElementById('critical-count').textContent = criticalCount;
  document.getElementById('high-count').textContent = highCount;
  document.getElementById('medium-count').textContent = mediumCount;

  // Apply background colors if > 0
  document.getElementById('critical-card').className = criticalCount > 0 ? 'card text-center severity-critical' : 'card text-center';
  document.getElementById('high-card').className = highCount > 0 ? 'card text-center severity-high' : 'card text-center';
  document.getElementById('medium-card').className = mediumCount > 0 ? 'card text-center severity-medium' : 'card text-center';

  // Build fraud flags table
  const tableBody = document.getElementById('fraud-flags-table');

  if (Object.keys(flagGroups).length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No fraud flags detected</td></tr>';
  } else {
    tableBody.innerHTML = Object.values(flagGroups).map(group => `
      <tr>
        <td>
          <p class="text-xs font-weight-bold mb-0">${group.code}</p>
        </td>
        <td>
          <p class="text-xs mb-0">${group.count}</p>
        </td>
        <td>
          <span class="badge badge-sm severity-${group.severity.toLowerCase()}">${group.severity}</span>
        </td>
        <td>
          <small class="text-xs">${group.timestamps.map(t => formatTime(new Date(t))).join(', ')}</small>
        </td>
      </tr>
    `).join('');
  }

  // Display risk scores
  const journeyRisk = calculateJourneyRiskScore();
  const verificationRisk = calculateVerificationRiskScore();
  const deviceRisk = calculateDeviceRiskScore(currentDeviceHistory);
  const totalRisk = journeyRisk + verificationRisk + deviceRisk;

  document.getElementById('journey-risk-score').textContent = journeyRisk;
  document.getElementById('verification-risk-score').textContent = verificationRisk;
  document.getElementById('device-risk-score').textContent = deviceRisk;
  document.getElementById('total-risk-score').textContent = totalRisk;

  // Risk level badge
  let riskLevel = 'LOW';
  let badgeClass = 'badge-success';

  if (totalRisk >= 200) {
    riskLevel = 'CRITICAL';
    badgeClass = 'badge-danger';
  } else if (totalRisk >= 100) {
    riskLevel = 'HIGH';
    badgeClass = 'badge-warning';
  } else if (totalRisk >= 50) {
    riskLevel = 'MEDIUM';
    badgeClass = 'badge-warning';
  }

  const riskBadge = document.getElementById('risk-level-badge');
  riskBadge.textContent = riskLevel;
  riskBadge.className = `badge ${badgeClass} badge-lg mt-2`;

  // Risk breakdown chart (simple bar visualization)
  const breakdownHtml = `
    <div class="mb-2">
      <small class="text-muted">Verification Risk (${Math.round(verificationRisk / totalRisk * 100)}%)</small>
      <div class="progress" style="height: 20px;">
        <div class="progress-bar bg-info" style="width: ${verificationRisk / totalRisk * 100}%">${verificationRisk}</div>
      </div>
    </div>
    <div class="mb-2">
      <small class="text-muted">Journey Risk (${Math.round(journeyRisk / totalRisk * 100)}%)</small>
      <div class="progress" style="height: 20px;">
        <div class="progress-bar bg-warning" style="width: ${journeyRisk / totalRisk * 100}%">${journeyRisk}</div>
      </div>
    </div>
    <div class="mb-2">
      <small class="text-muted">Device Risk (${Math.round(deviceRisk / totalRisk * 100)}%)</small>
      <div class="progress" style="height: 20px;">
        <div class="progress-bar bg-danger" style="width: ${deviceRisk / totalRisk * 100}%">${deviceRisk}</div>
      </div>
    </div>
  `;

  document.getElementById('risk-breakdown-chart').innerHTML = breakdownHtml;
}

// Display Device History (Tab 3)
function displayDeviceHistory() {
  if (!currentDeviceHistory) {
    document.getElementById('device-profile-id').textContent = truncateId(currentSessionData.deviceIdentifier);
    document.getElementById('device-first-seen').textContent = '-';
    document.getElementById('device-total-sessions').textContent = '1';
    document.getElementById('device-successful').textContent = '0';
    document.getElementById('device-failed').textContent = '0';
    document.getElementById('device-abandoned').textContent = '0';
    document.getElementById('device-success-rate').textContent = '0%';
    document.getElementById('device-fraud-flags').textContent = '0';
    document.getElementById('device-document-types').innerHTML = '<span class="badge bg-secondary">Unknown</span>';
    return;
  }

  const device = currentDeviceHistory;

  // Device Profile
  document.getElementById('device-profile-id').textContent = truncateId(device.deviceIdentifier);
  document.getElementById('device-first-seen').textContent = formatDate(new Date(device.firstSeen));
  document.getElementById('device-total-sessions').textContent = device.totalSessions || 0;
  document.getElementById('device-successful').textContent = device.successfulSessions || 0;
  document.getElementById('device-failed').textContent = device.failedSessions || 0;
  document.getElementById('device-abandoned').textContent = device.abandonedSessions || 0;
  document.getElementById('device-success-rate').textContent = `${Math.round(device.successRate * 100)}%`;
  document.getElementById('device-fraud-flags').textContent = device.totalHistoricalFlags || 0;

  // Document types
  const docTypes = device.documentTypesUsed || [];
  const docTypesHtml = docTypes.map(type => `<span class="badge bg-info me-1">${formatDocumentType(type)}</span>`).join('');
  document.getElementById('device-document-types').innerHTML = docTypesHtml || '<span class="badge bg-secondary">None</span>';

  // Device alert
  if (device.totalSessions > 1) {
    document.getElementById('device-alert').style.display = 'block';
    document.getElementById('device-alert-text').innerHTML = `
      This device has <strong>${device.totalSessions}</strong> previous onboarding attempts |
      Success Rate: <strong>${Math.round(device.successRate * 100)}%</strong> |
      Previous Fraud Flags: <strong>${device.totalHistoricalFlags || 0}</strong>
    `;
  }

  // Previous sessions table
  const sessions = device.previousSessions || [];
  const tableBody = document.getElementById('device-sessions-table');

  if (sessions.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No previous sessions found</td></tr>';
  } else {
    tableBody.innerHTML = sessions.map(session => `
      <tr>
        <td><small>${formatDate(new Date(session.timestamp))}</small></td>
        <td><span class="badge badge-sm badge-outcome-${session.outcome.toLowerCase()}">${session.outcome}</span></td>
        <td><small>${formatDuration(session.duration)}</small></td>
        <td><small>${session.fraudFlags || 0}</small></td>
        <td><span class="badge badge-sm bg-secondary">${formatDocumentType(session.documentType)}</span></td>
        <td><small class="text-muted">${session.failureReason || '-'}</small></td>
      </tr>
    `).join('');
  }
}

// Display UX Analysis (Tab 4)
function displayUXAnalysis() {
  // Session Flow Metrics
  const flowMetrics = calculateFlowMetrics(currentEventsData);
  const flowHtml = `
    <div class="mb-3">
      <small class="text-muted">Total Duration</small>
      <h6>${formatDuration(flowMetrics.totalDuration)}</h6>
    </div>
    <div class="mb-3">
      <small class="text-muted">Time to First Interaction</small>
      <h6>${flowMetrics.timeToFirstInteraction}s</h6>
    </div>
    <div class="mb-3">
      <small class="text-muted">Document Scan Time</small>
      <h6>${flowMetrics.scanTime}s</h6>
    </div>
    <div class="mb-3">
      <small class="text-muted">NFC Reading Time</small>
      <h6>${flowMetrics.readTime}s</h6>
    </div>
    <div class="mb-3">
      <small class="text-muted">Face Verification Time</small>
      <h6>${flowMetrics.faceTime}s</h6>
    </div>
  `;

  document.getElementById('session-flow-metrics').innerHTML = flowHtml;

  // Conversion Funnel
  const funnel = buildConversionFunnel(currentEventsData);
  document.getElementById('conversion-funnel').innerHTML = funnel;

  // Friction Analysis
  const frictionData = calculateFrictionScores(currentEventsData);
  const frictionTable = document.getElementById('friction-analysis-table');

  if (frictionData.length === 0) {
    frictionTable.innerHTML = '<tr><td colspan="6" class="text-center">No friction data available</td></tr>';
  } else {
    frictionTable.innerHTML = frictionData.map(step => `
      <tr>
        <td><span class="font-weight-bold">${step.name}</span></td>
        <td><span class="font-weight-bold">${step.score}</span></td>
        <td><span class="friction-${step.level.toLowerCase()}">${step.level}</span></td>
        <td><small>${step.issues.join(', ') || 'None'}</small></td>
        <td><small>${step.duration}s</small></td>
        <td><small>${step.attempts}</small></td>
      </tr>
    `).join('');
  }

  // Environment Issues
  const envIssues = calculateEnvironmentIssues(currentEventsData);
  const envHtml = `
    <div class="col-md-2 text-center">
      <i class="material-symbols-rounded text-warning" style="font-size: 32px;">dark_mode</i>
      <h6 class="mt-2">${envIssues.dark}</h6>
      <small class="text-muted">Dark Environment</small>
    </div>
    <div class="col-md-2 text-center">
      <i class="material-symbols-rounded text-warning" style="font-size: 32px;">blur_on</i>
      <h6 class="mt-2">${envIssues.blur}</h6>
      <small class="text-muted">Blur Detected</small>
    </div>
    <div class="col-md-2 text-center">
      <i class="material-symbols-rounded text-warning" style="font-size: 32px;">light_mode</i>
      <h6 class="mt-2">${envIssues.glare}</h6>
      <small class="text-muted">Glare Detected</small>
    </div>
    <div class="col-md-3 text-center">
      <i class="material-symbols-rounded text-warning" style="font-size: 32px;">center_focus_weak</i>
      <h6 class="mt-2">${envIssues.position}</h6>
      <small class="text-muted">Position Issues</small>
    </div>
    <div class="col-md-3 text-center">
      <i class="material-symbols-rounded text-warning" style="font-size: 32px;">straighten</i>
      <h6 class="mt-2">${envIssues.distance}</h6>
      <small class="text-muted">Distance Issues</small>
    </div>
  `;

  document.getElementById('environment-issues').innerHTML = envHtml;
}

// Calculate flow metrics
function calculateFlowMetrics(events) {
  const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const initEvent = sortedEvents.find(e => e.page === 'INIT');
  const firstUserEvent = sortedEvents.find(e => e.page !== 'INIT');
  const scanStart = sortedEvents.find(e => e.page === 'SCAN' && e.status === 'START');
  const scanComplete = sortedEvents.find(e => e.page === 'SCAN' && e.status === 'SUCCESS');
  const readStart = sortedEvents.find(e => e.page === 'READ' && e.status === 'START');
  const readComplete = sortedEvents.find(e => e.page === 'READ' && e.status === 'SUCCESS');
  const faceStart = sortedEvents.find(e => e.page === 'FACE' && e.status === 'START');
  const faceComplete = sortedEvents.find(e => e.page === 'FACE' && e.status === 'SUCCESS');

  return {
    totalDuration: calculateSessionDuration(events),
    timeToFirstInteraction: initEvent && firstUserEvent ? Math.floor((new Date(firstUserEvent.timestamp) - new Date(initEvent.timestamp)) / 1000) : 0,
    scanTime: scanStart && scanComplete ? Math.floor((new Date(scanComplete.timestamp) - new Date(scanStart.timestamp)) / 1000) : 0,
    readTime: readStart && readComplete ? Math.floor((new Date(readComplete.timestamp) - new Date(readStart.timestamp)) / 1000) : 0,
    faceTime: faceStart && faceComplete ? Math.floor((new Date(faceComplete.timestamp) - new Date(faceStart.timestamp)) / 1000) : 0
  };
}

// Build conversion funnel
function buildConversionFunnel(events) {
  const steps = ['INIT', 'SCAN', 'READ', 'FACE', 'FINISH'];
  let html = '';

  steps.forEach((step, index) => {
    const hasSuccess = events.some(e => e.page === step && e.status === 'SUCCESS');
    const hasFail = events.some(e => e.page === step && e.status === 'FAILURE');
    const status = hasSuccess ? 'completed' : hasFail ? 'failed' : 'pending';
    const icon = status === 'completed' ? 'check' : status === 'failed' ? 'close' : 'remove';

    html += `
      <div class="progress-step">
        <div class="progress-step-icon progress-step-${status}">
          <i class="material-symbols-rounded" style="font-size: 14px;">${icon}</i>
        </div>
        <span>${step}</span>
      </div>
    `;
  });

  return html;
}

// Calculate friction scores
function calculateFrictionScores(events) {
  const steps = ['SCAN', 'READ', 'FACE'];
  const results = [];

  steps.forEach(stepName => {
    const stepEvents = events.filter(e => e.page === stepName);
    if (stepEvents.length === 0) return;

    const attempts = stepEvents.filter(e => e.status === 'START').length;
    const issues = stepEvents.filter(e => e.status === 'FAILURE').map(e => e.statusCode);
    const startEvent = stepEvents.find(e => e.status === 'START');
    const endEvent = stepEvents.find(e => e.status === 'SUCCESS');
    const duration = startEvent && endEvent ? Math.floor((new Date(endEvent.timestamp) - new Date(startEvent.timestamp)) / 1000) : 0;

    const attemptPenalty = (attempts - 1) * 20;
    const durationPenalty = Math.max(0, (duration / 30 - 1)) * 30; // 30s benchmark
    const issuePenalty = issues.length * 10;

    const score = Math.round(attemptPenalty + durationPenalty + issuePenalty);
    const level = score > 70 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW';

    results.push({
      name: stepName,
      score,
      level,
      issues: [...new Set(issues)],
      duration,
      attempts
    });
  });

  return results;
}

// Calculate environment issues
function calculateEnvironmentIssues(events) {
  return {
    dark: events.filter(e => e.statusCode && e.statusCode.includes('DARK_ENVIRONMENT')).length,
    blur: events.filter(e => e.statusCode && e.statusCode.includes('BLUR_DETECTED')).length,
    glare: events.filter(e => e.statusCode && e.statusCode.includes('GLARE_DETECTED')).length,
    position: events.filter(e => e.statusCode && e.statusCode.includes('INCORRECT_POSITION')).length,
    distance: events.filter(e => e.statusCode && e.statusCode.includes('INCORRECT_DISTANCE')).length
  };
}

// Format time for display
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Check for session ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  if (sessionId) {
    document.getElementById('session-search-input').value = sessionId;
    loadSessionData(sessionId);
  }
});
