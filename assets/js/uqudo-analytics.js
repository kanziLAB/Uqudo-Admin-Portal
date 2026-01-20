// Uqudo Analytics Dashboard
// SDK Analytics capabilities demonstration

let currentSessionData = null;
let currentVerificationData = null;
let currentEventsData = [];
let currentDeviceHistory = null;
let currentRawData = null; // Store raw data for debugging
let analyticsConfig = null; // KYC setup analytics configuration

// Default risk thresholds matching KYC Setup Analytics Configuration
// Risk Score: 0-100 where LOWER score = LOWER risk (better)
// These thresholds define the UPPER BOUND for each risk level
const DEFAULT_RISK_THRESHOLDS = {
  low: 50,     // Score 0-50 = LOW risk (green/approve)
  medium: 100, // Score 51-100 = MEDIUM risk (yellow/review) - capped at 100
  high: 100    // For 0-100 scale, high threshold is capped
};

// Load analytics configuration from KYC setup
async function loadAnalyticsConfig() {
  try {
    const response = await api.getKYCSetup();
    if (response.success && response.data) {
      analyticsConfig = response.data.analytics_config || null;
      console.log('📊 Analytics config loaded:', analyticsConfig);
    }
  } catch (e) {
    console.warn('Could not load analytics config, using defaults:', e);
  }
}

// Get risk thresholds from analytics config
// Returns thresholds scaled to 0-100 range
function getRiskThresholds() {
  if (analyticsConfig?.risk_thresholds) {
    // KYC Setup uses 0-200+ scale, we scale to 0-100
    // low=50 -> 25, medium=100 -> 50, high=200 -> 100
    const configLow = analyticsConfig.risk_thresholds.low || 50;
    const configMedium = analyticsConfig.risk_thresholds.medium || 100;
    const configHigh = analyticsConfig.risk_thresholds.high || 200;

    return {
      low: Math.min(100, configLow / 2),      // 50 -> 25
      medium: Math.min(100, configMedium / 2), // 100 -> 50
      high: Math.min(100, configHigh / 2)      // 200 -> 100
    };
  }
  return DEFAULT_RISK_THRESHOLDS;
}

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

// Search for session (supports both Account ID and JTI)
document.getElementById('search-session-btn').addEventListener('click', async () => {
  const searchValue = document.getElementById('session-search-input').value.trim();
  if (!searchValue) {
    showError('Please enter a Session ID (JTI) or Account ID');
    return;
  }

  await searchSession(searchValue);
});

// Allow Enter key to search
document.getElementById('session-search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('search-session-btn').click();
  }
});

// Search session by Account ID or JTI
async function searchSession(searchValue) {
  try {
    showLoading();

    // First try as account ID (direct lookup)
    let response = await api.getAccountById(searchValue);

    // If not found by account ID, search by JTI in sdk_source
    if (!response.success) {
      // Fetch all accounts and search for JTI
      const accountsResponse = await api.getAccounts({ limit: 100 });
      if (accountsResponse.success && accountsResponse.data) {
        const matchingAccount = accountsResponse.data.find(account => {
          if (account.sdk_source) {
            try {
              const sdkSource = typeof account.sdk_source === 'string' ?
                JSON.parse(account.sdk_source) : account.sdk_source;
              return sdkSource.jti === searchValue || sdkSource.sessionId === searchValue;
            } catch (e) {
              return false;
            }
          }
          return false;
        });

        if (matchingAccount) {
          response = { success: true, data: matchingAccount };
        } else {
          hideLoading();
          showError('No session found with this ID or JTI');
          return;
        }
      }
    }

    hideLoading();

    if (response.success && response.data) {
      // Filter the list to show only this session
      sessionsListData = [response.data];
      updateSummaryCards(sessionsListData);
      buildSessionsTable(sessionsListData);

      // Update search placeholder
      document.getElementById('session-search-input').placeholder = 'Search by JTI or Account ID';
    }
  } catch (error) {
    hideLoading();
    console.error('Error searching session:', error);
    showError('Error searching for session');
  }
}

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

  // Session ID - display full ID
  const sessionIdValue = session.sessionId || session.id || '-';
  document.getElementById('session-id-display').textContent = sessionIdValue;
  document.getElementById('session-id').value = sessionIdValue;

  // Device ID - display full ID
  const deviceIdValue = session.deviceIdentifier || '-';
  document.getElementById('device-id-display').textContent = deviceIdValue;
  document.getElementById('device-id').value = deviceIdValue;

  // Document Type - extract from START event if available
  let docType = currentVerificationData.documentType || session.documentType || 'Unknown';
  if (docType === 'Unknown' && currentEventsData && currentEventsData.length > 0) {
    const startEvent = currentEventsData.find(e => (e.name || e.event) === 'START');
    if (startEvent && startEvent.id && startEvent.id !== 'START') {
      docType = startEvent.id;
    }
  }
  document.getElementById('document-type-badge').textContent = formatDocumentType(docType);

  // Outcome
  const outcome = determineOutcome(session, currentEventsData);
  const outcomeBadge = document.getElementById('outcome-badge');
  outcomeBadge.textContent = outcome;
  outcomeBadge.className = `badge badge-outcome-${outcome.toLowerCase()} mt-1`;

  // Risk Assessment - Calculate comprehensive risk score
  const { riskScore, riskClass } = calculateComprehensiveRiskFromSession(session, currentVerificationData, currentEventsData);
  const riskBadge = document.getElementById('risk-badge');
  riskBadge.textContent = `${riskScore}`;
  riskBadge.className = `badge badge-${riskClass} mt-1`;

  // Duration
  const duration = calculateSessionDuration(currentEventsData);
  document.getElementById('duration-display').textContent = formatDuration(duration);

  // Platform with icon
  const platform = session.platform || session.devicePlatform || 'Unknown';
  const platformLower = platform.toLowerCase();
  const platformIcon = document.getElementById('platform-icon');
  const platformBadge = document.getElementById('platform-badge');

  if (platformLower.includes('android') || platformLower.includes('mobile') || platformLower.includes('ios')) {
    platformIcon.textContent = 'phone_iphone';
    platformIcon.style.color = '#4caf50';
  } else if (platformLower.includes('web') || platformLower.includes('browser')) {
    platformIcon.textContent = 'language';
    platformIcon.style.color = '#1e88e5';
  } else {
    platformIcon.textContent = 'devices';
    platformIcon.style.color = '#67748e';
  }
  platformBadge.textContent = platform;

  // Timestamp
  const timestamp = new Date(session.created_at || session.timestamp);
  document.getElementById('timestamp-display').textContent = formatDateTime(timestamp);

  // Update Conversion Funnel based on events
  updateConversionFunnel(currentEventsData);
}

// Update the conversion funnel visualization based on trace events
function updateConversionFunnel(events) {
  if (!events || events.length === 0) return;

  // Map events to funnel steps
  const funnelSteps = {
    'funnel-scan': false,
    'funnel-start': false,
    'funnel-complete': false,
    'funnel-face': false
  };

  const connectorStatus = {
    'connector-1': 'incomplete',
    'connector-2': 'incomplete',
    'connector-3': 'incomplete'
  };

  // Check which steps are completed based on events
  events.forEach(event => {
    const name = (event.name || event.event || '').toUpperCase();
    const type = (event.type || event.page || '').toUpperCase();
    const status = (event.status || '').toUpperCase();

    // SCAN VIEW
    if (name === 'SCAN' && type === 'VIEW') {
      funnelSteps['funnel-scan'] = true;
    }
    // SCAN START
    if (name === 'SCAN' && type === 'START') {
      funnelSteps['funnel-start'] = true;
      connectorStatus['connector-1'] = 'complete';
    }
    // SCAN COMPLETE
    if (name === 'SCAN' && type === 'COMPLETE') {
      funnelSteps['funnel-complete'] = true;
      connectorStatus['connector-2'] = 'complete';
    }
    // FACE VIEW
    if (name === 'FACE' && type === 'VIEW') {
      funnelSteps['funnel-face'] = true;
      connectorStatus['connector-3'] = 'complete';
    }
  });

  // Update funnel circles
  Object.keys(funnelSteps).forEach(stepId => {
    const circle = document.getElementById(stepId);
    if (circle) {
      if (funnelSteps[stepId]) {
        circle.classList.remove('pending', 'failed');
        circle.querySelector('i').textContent = 'check';
      } else {
        circle.classList.add('pending');
        circle.querySelector('i').textContent = 'hourglass_empty';
      }
    }
  });

  // Update connectors
  Object.keys(connectorStatus).forEach(connectorId => {
    const connector = document.getElementById(connectorId);
    if (connector) {
      connector.classList.remove('pending', 'incomplete');
      if (connectorStatus[connectorId] !== 'complete') {
        connector.classList.add('incomplete');
      }
    }
  });
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

// Calculate session duration from trace events
function calculateSessionDuration(events) {
  if (!events || events.length === 0) return 0;

  // Method 1: Sum all event durations if available
  let totalDuration = 0;
  let hasDuration = false;

  events.forEach(event => {
    if (event.duration !== undefined && event.duration !== null) {
      totalDuration += event.duration;
      hasDuration = true;
    }
  });

  // If we have duration data, return it
  if (hasDuration && totalDuration > 0) {
    // Convert from milliseconds to seconds
    return Math.round(totalDuration / 1000);
  }

  // Method 2: Calculate from timestamps if no duration field
  // Find first and last event timestamps
  let firstTimestamp = null;
  let lastTimestamp = null;

  events.forEach(event => {
    if (event.timestamp) {
      const ts = new Date(event.timestamp).getTime();
      if (!isNaN(ts)) {
        if (firstTimestamp === null || ts < firstTimestamp) {
          firstTimestamp = ts;
        }
        if (lastTimestamp === null || ts > lastTimestamp) {
          lastTimestamp = ts;
        }
      }
    }
  });

  if (firstTimestamp !== null && lastTimestamp !== null) {
    // Return duration in seconds
    return Math.round((lastTimestamp - firstTimestamp) / 1000);
  }

  return 0;
}

// Build visual journey flow from trace events
function buildJourneyFlow(events) {
  if (!events || events.length === 0) {
    return '<span class="text-xs text-secondary">No trace data</span>';
  }

  // Build journey with badges and arrows
  const journeyHTML = events.map((event, index) => {
    const eventName = event.name || event.event || event.type || 'UNKNOWN';
    const duration = event.duration || 0;
    const status = event.status || 'SUCCESS';

    // Color based on status
    let badgeColor = 'success';
    if (status === 'FAILURE' || status === 'failure' || status === 'FAILED') {
      badgeColor = 'danger';
    } else if (status === 'PENDING' || status === 'pending') {
      badgeColor = 'warning';
    }

    // Format duration
    const durationText = duration > 0 ? ` (${(duration / 1000).toFixed(1)}s)` : '';

    const badge = `<span class="badge badge-sm bg-${badgeColor}">${eventName}${durationText}</span>`;
    const arrow = index < events.length - 1 ? '<i class="material-symbols-rounded text-secondary mx-1" style="font-size: 12px;">arrow_forward</i>' : '';

    return badge + arrow;
  }).join('');

  return `
    <div class="d-flex align-items-center flex-wrap" style="gap: 4px;">
      ${journeyHTML}
      <span class="badge badge-sm bg-gradient-info ms-2">${events.length} events</span>
    </div>
  `;
}

// Calculate comprehensive risk score from all verification scores
// Returns a score from 0-100 where higher = better/lower risk
function calculateComprehensiveRisk(session) {
  let totalScore = 0;
  let scoreCount = 0;
  let details = [];

  try {
    // Parse verifications - try multiple sources
    let verifications = null;

    // Priority 1: sdk_verifications column
    if (session.sdk_verifications) {
      verifications = typeof session.sdk_verifications === 'string'
        ? JSON.parse(session.sdk_verifications)
        : session.sdk_verifications;

      // If sdk_verifications is an array, get the first element
      if (Array.isArray(verifications) && verifications.length > 0) {
        verifications = verifications[0];
      }
    }

    // Priority 2: fraud_scores column (dedicated fraud detection scores)
    if (!verifications && session.fraud_scores) {
      verifications = typeof session.fraud_scores === 'string'
        ? JSON.parse(session.fraud_scores)
        : session.fraud_scores;
    }

    // Merge fraud_scores into verifications if both exist (fraud_scores has priority for scores)
    if (verifications && session.fraud_scores) {
      const fraudScores = typeof session.fraud_scores === 'string'
        ? JSON.parse(session.fraud_scores)
        : session.fraud_scores;

      // Merge fraud_scores over verifications (fraud_scores takes priority)
      verifications = { ...verifications, ...fraudScores };
    }

    if (verifications) {
      // Screen Detection Score (0-100, high detection score = bad, so invert)
      if (verifications.idScreenDetection?.enabled && verifications.idScreenDetection?.score !== undefined) {
        const score = 100 - verifications.idScreenDetection.score; // Invert: low detection = good
        totalScore += score;
        scoreCount++;
        if (score < 50) details.push(`Screen: ${100 - score}`);
      }

      // Print Detection Score (0-100, high detection score = bad, so invert)
      if (verifications.idPrintDetection?.enabled && verifications.idPrintDetection?.score !== undefined) {
        const score = 100 - verifications.idPrintDetection.score;
        totalScore += score;
        scoreCount++;
        if (score < 50) details.push(`Print: ${100 - score}`);
      }

      // Photo Tampering Score (0-100, high detection score = bad, so invert)
      if (verifications.idPhotoTamperingDetection?.enabled && verifications.idPhotoTamperingDetection?.score !== undefined) {
        const score = 100 - verifications.idPhotoTamperingDetection.score;
        totalScore += score;
        scoreCount++;
        if (score < 50) details.push(`Tampering: ${100 - score}`);
      }

      // Source Detection - optimal resolution = good
      if (verifications.sourceDetection?.enabled) {
        const score = verifications.sourceDetection.optimalResolution ? 100 : 70;
        totalScore += score;
        scoreCount++;
        if (!verifications.sourceDetection.optimalResolution) details.push('Non-optimal resolution');
      }

      // Face Match Level - HIGH = good
      if (verifications.faceMatchLevel) {
        const score = verifications.faceMatchLevel === 'HIGH' ? 100 :
                      verifications.faceMatchLevel === 'MEDIUM' ? 70 : 40;
        totalScore += score;
        scoreCount++;
        if (score < 70) details.push(`Face: ${verifications.faceMatchLevel}`);
      }

      // Liveness Level - HIGH = good
      if (verifications.livenessLevel) {
        const score = verifications.livenessLevel === 'HIGH' ? 100 :
                      verifications.livenessLevel === 'MEDIUM' ? 70 : 40;
        totalScore += score;
        scoreCount++;
        if (score < 70) details.push(`Liveness: ${verifications.livenessLevel}`);
      }

      // Document Validity - valid = good
      if (verifications.documentValid !== undefined) {
        const score = verifications.documentValid ? 100 : 0;
        totalScore += score;
        scoreCount++;
        if (!verifications.documentValid) details.push('Doc: Invalid');
      }

      // MRZ Validity - valid = good
      if (verifications.mrzValid !== undefined) {
        const score = verifications.mrzValid ? 100 : 30;
        totalScore += score;
        scoreCount++;
        if (!verifications.mrzValid) details.push('MRZ: Invalid');
      }
    }

    // Check for failure events in analytics - try multiple sources
    let analyticsEvents = [];

    // Priority 1: sdk_analytics column
    if (session.sdk_analytics) {
      const analytics = typeof session.sdk_analytics === 'string'
        ? JSON.parse(session.sdk_analytics)
        : session.sdk_analytics;
      analyticsEvents = Array.isArray(analytics) ? analytics : analytics.events || [];
    }

    // Priority 2: sdk_trace column (complete raw trace from SDK)
    if (analyticsEvents.length === 0 && session.sdk_trace) {
      const trace = typeof session.sdk_trace === 'string'
        ? JSON.parse(session.sdk_trace)
        : session.sdk_trace;
      analyticsEvents = Array.isArray(trace) ? trace : [];
    }

    if (analyticsEvents.length > 0) {
      const failureCount = analyticsEvents.filter(e =>
        e.status === 'FAILURE' || e.status === 'failure' || e.status === 'FAILED'
      ).length;

      if (failureCount > 0) {
        // Deduct points for failures (max 30 point penalty)
        const failurePenalty = Math.min(failureCount * 10, 30);
        totalScore = Math.max(0, totalScore - failurePenalty);
        details.push(`Failures: ${failureCount}`);
      }
    }

  } catch (e) {
    console.error('Error calculating risk score:', e);
  }

  // Calculate quality score (0-100, higher = better quality)
  const qualityScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 50;

  // Convert to risk score (0-100, lower = lower risk)
  // Quality 100 = Risk 0, Quality 0 = Risk 100
  const riskScore = 100 - qualityScore;

  // Get configurable risk thresholds from Analytics Configuration
  const thresholds = getRiskThresholds();

  // Determine risk class based on configured thresholds
  // Lower risk score = lower risk (green)
  let riskClass = 'success'; // Green for low risk
  if (riskScore > thresholds.medium) {
    riskClass = 'danger'; // Red for high/critical risk (above medium threshold)
  } else if (riskScore > thresholds.low) {
    riskClass = 'warning'; // Yellow for medium risk (above low threshold)
  }

  const riskDetails = details.length > 0 ? details.join(' | ') : 'Low risk';

  return {
    riskScore: riskScore,
    riskClass: riskClass,
    riskDetails: riskDetails
  };
}

// Calculate comprehensive risk for session detail view (works with separate verification data and events)
// Calculate comprehensive risk for session detail view
// Returns a score from 0-100 where higher = better/lower risk
function calculateComprehensiveRiskFromSession(session, verifications, events) {
  let totalScore = 0;
  let scoreCount = 0;

  try {
    // Screen Detection Score (invert: low detection = good)
    if (verifications.idScreenDetection?.enabled && verifications.idScreenDetection?.score !== undefined) {
      totalScore += 100 - verifications.idScreenDetection.score;
      scoreCount++;
    }

    // Print Detection Score (invert: low detection = good)
    if (verifications.idPrintDetection?.enabled && verifications.idPrintDetection?.score !== undefined) {
      totalScore += 100 - verifications.idPrintDetection.score;
      scoreCount++;
    }

    // Photo Tampering Score (invert: low detection = good)
    if (verifications.idPhotoTamperingDetection?.enabled && verifications.idPhotoTamperingDetection?.score !== undefined) {
      totalScore += 100 - verifications.idPhotoTamperingDetection.score;
      scoreCount++;
    }

    // Source Detection - optimal = good
    if (verifications.sourceDetection?.enabled) {
      totalScore += verifications.sourceDetection.optimalResolution ? 100 : 70;
      scoreCount++;
    }

    // Face Match Level - HIGH = good
    if (verifications.faceMatchLevel !== undefined) {
      let score;
      if (typeof verifications.faceMatchLevel === 'number') {
        score = (verifications.faceMatchLevel / 5) * 100;
      } else {
        score = verifications.faceMatchLevel === 'HIGH' ? 100 :
                verifications.faceMatchLevel === 'MEDIUM' ? 70 : 40;
      }
      totalScore += score;
      scoreCount++;
    }

    // Liveness Level - HIGH = good
    if (verifications.livenessLevel !== undefined) {
      let score;
      if (typeof verifications.livenessLevel === 'number') {
        score = (verifications.livenessLevel / 5) * 100;
      } else {
        score = verifications.livenessLevel === 'HIGH' ? 100 :
                verifications.livenessLevel === 'MEDIUM' ? 70 : 40;
      }
      totalScore += score;
      scoreCount++;
    }

    // Document Validity - valid = good
    if (verifications.documentValid !== undefined) {
      totalScore += verifications.documentValid ? 100 : 0;
      scoreCount++;
    }

    // MRZ Validity - valid = good
    if (verifications.mrzValid !== undefined) {
      totalScore += verifications.mrzValid ? 100 : 30;
      scoreCount++;
    }

    // Check for failure events
    if (events && events.length > 0) {
      const failureCount = events.filter(e =>
        e.status === 'FAILURE' || e.status === 'failure' || e.status === 'FAILED' || e.status === 'failed'
      ).length;

      if (failureCount > 0) {
        const penalty = Math.min(failureCount * 10, 30);
        totalScore = Math.max(0, totalScore - penalty);
      }
    }
  } catch (e) {
    console.error('Error calculating session risk score:', e);
  }

  // Calculate quality score (0-100, higher = better quality)
  const qualityScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 50;

  // Convert to risk score (0-100, lower = lower risk)
  const riskScore = 100 - qualityScore;

  // Get configurable risk thresholds
  const thresholds = getRiskThresholds();

  // Determine risk class based on configured thresholds (lower risk score = lower risk)
  let riskClass = 'risk-approve';
  if (riskScore > thresholds.medium) {
    riskClass = 'risk-reject';
  } else if (riskScore > thresholds.low) {
    riskClass = 'risk-review';
  }

  return {
    riskScore: riskScore,
    riskClass: riskClass
  };
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

// Calculate UX Analysis Score from friction analysis
// Returns { score: number, level: string, emoji: string, details: string }
function calculateUXScore(events) {
  if (!events || events.length === 0) {
    return { score: 0, level: 'N/A', emoji: '❓', details: 'No events data' };
  }

  const frictionData = calculateFrictionScoresForTable(events);

  if (frictionData.length === 0) {
    return { score: 100, level: 'EXCELLENT', emoji: '😊', details: 'Smooth journey, no friction detected' };
  }

  // Calculate average friction score
  const totalScore = frictionData.reduce((sum, step) => sum + step.score, 0);
  const avgScore = totalScore / frictionData.length;

  // Convert friction score to UX score (inverse - lower friction = higher UX)
  const uxScore = Math.max(0, 100 - avgScore);

  // Determine level and emoji based on UX score
  let level, emoji, details;
  if (uxScore >= 80) {
    level = 'EXCELLENT';
    emoji = '😊';
    details = 'Excellent user experience';
  } else if (uxScore >= 60) {
    level = 'GOOD';
    emoji = '🙂';
    details = 'Good user experience';
  } else if (uxScore >= 40) {
    level = 'FAIR';
    emoji = '😐';
    details = 'Fair experience, some friction';
  } else if (uxScore >= 20) {
    level = 'POOR';
    emoji = '😕';
    details = 'Poor experience, high friction';
  } else {
    level = 'CRITICAL';
    emoji = '😟';
    details = 'Critical friction issues';
  }

  // Add step-specific details
  const stepDetails = frictionData.map(s => `${s.name}: ${s.level}`).join(', ');
  details += ` | ${stepDetails}`;

  return { score: Math.round(uxScore), level, emoji, details };
}

// Simplified friction calculation for table (without requiring global state)
function calculateFrictionScoresForTable(events) {
  const stepPatterns = [
    { name: 'SCAN', patterns: ['SCAN', 'SCANNING', 'DOCUMENT_SCAN'] },
    { name: 'READ', patterns: ['READ', 'NFC', 'NFC_READ', 'NFC_READING', 'READING'] },
    { name: 'FACE', patterns: ['FACE', 'FACIAL', 'LIVENESS', 'FACE_MATCH', 'BIOMETRIC'] }
  ];

  const results = [];

  stepPatterns.forEach(({ name: stepName, patterns }) => {
    const stepEvents = events.filter(e => {
      const eventName = (e.name || e.event || '').toUpperCase();
      const category = (e.category || e.type || '').toUpperCase();
      const page = (e.page || '').toUpperCase();
      return patterns.some(pattern =>
        eventName.includes(pattern) || category === pattern || page === pattern ||
        category.includes(pattern) || page.includes(pattern)
      );
    });

    if (stepEvents.length === 0) return;

    const attempts = stepEvents.filter(e => {
      const status = (e.status || '').toUpperCase();
      return status === 'START' || status === 'STARTED';
    }).length || 1;

    const issues = stepEvents.filter(e => {
      const status = (e.status || '').toUpperCase();
      return status === 'FAILURE' || status === 'FAILED' || status === 'ERROR';
    }).length;

    let duration = 0;
    stepEvents.forEach(e => {
      duration += (e.duration || 0) / 1000;
    });

    const attemptPenalty = (attempts - 1) * 20;
    const durationPenalty = Math.max(0, (duration / 30 - 1)) * 30;
    const issuePenalty = issues * 10;

    const score = Math.round(attemptPenalty + durationPenalty + issuePenalty);
    const level = score > 70 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW';

    results.push({ name: stepName, score, level });
  });

  return results;
}

// Calculate Total Risk Score for table (from Journey Fraud Flags)
function calculateTotalRiskScoreForTable(session) {
  let totalRisk = 0;

  // Parse events
  let events = [];
  if (session.sdk_analytics) {
    try {
      const analytics = typeof session.sdk_analytics === 'string' ? JSON.parse(session.sdk_analytics) : session.sdk_analytics;
      events = Array.isArray(analytics) ? analytics : (analytics.events || []);
    } catch (e) {}
  }
  if (events.length === 0 && session.sdk_trace) {
    try {
      const trace = typeof session.sdk_trace === 'string' ? JSON.parse(session.sdk_trace) : session.sdk_trace;
      events = Array.isArray(trace) ? trace : [];
    } catch (e) {}
  }

  // Journey Risk from failures
  events.forEach(event => {
    if (event.status === 'FAILURE') {
      const severity = getSeverity(event.statusCode);
      if (severity === 'CRITICAL') totalRisk += 100;
      if (severity === 'HIGH') totalRisk += 50;
      if (severity === 'MEDIUM') totalRisk += 10;
    }
  });

  // Parse verifications
  let verifications = {};
  if (session.sdk_verifications) {
    try {
      verifications = typeof session.sdk_verifications === 'string' ? JSON.parse(session.sdk_verifications) : session.sdk_verifications;
      if (Array.isArray(verifications) && verifications.length > 0) {
        verifications = verifications[0];
      }
    } catch (e) {}
  }
  if (session.fraud_scores) {
    try {
      const fraudScores = typeof session.fraud_scores === 'string' ? JSON.parse(session.fraud_scores) : session.fraud_scores;
      verifications = { ...verifications, ...fraudScores };
    } catch (e) {}
  }

  // Verification Risk
  if (verifications.idPhotoTamperingDetection?.score > 40) totalRisk += 80;
  if (verifications.idScreenDetection?.score > 30) totalRisk += 40;
  if (verifications.idPrintDetection?.score > 30) totalRisk += 30;
  if (verifications.faceLiveness?.score < 50) totalRisk += 60;
  if (verifications.faceMatch?.score < 70) totalRisk += 40;

  return totalRisk;
}

// Get risk class based on total risk score
function getTotalRiskClass(totalRisk) {
  if (totalRisk >= 200) return 'danger';
  if (totalRisk >= 50) return 'warning';
  return 'success';
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

  // Risk level badge - uses configured thresholds from analytics_config.risk_thresholds
  // These thresholds are cumulative risk points (higher = worse)
  const riskThresholds = getRiskThresholds();

  let riskLevel = 'LOW';
  let badgeClass = 'badge-success';

  if (totalRisk >= riskThresholds.high) {
    riskLevel = 'CRITICAL';
    badgeClass = 'badge-danger';
  } else if (totalRisk >= riskThresholds.medium) {
    riskLevel = 'HIGH';
    badgeClass = 'badge-warning';
  } else if (totalRisk >= riskThresholds.low) {
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
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No previous sessions found</td></tr>';
  } else {
    tableBody.innerHTML = sessions.map(session => `
      <tr>
        <td><small>${formatDate(new Date(session.timestamp))}</small></td>
        <td><span class="badge badge-sm badge-outcome-${(session.outcome || 'pending').toLowerCase()}">${session.outcome || 'PENDING'}</span></td>
        <td><span class="badge badge-sm bg-secondary">${formatDocumentType(session.documentType)}</span></td>
        <td><small>${session.platform || 'Unknown'}</small></td>
        <td>
          <button class="btn btn-link btn-sm p-0 text-info" onclick="viewFullSessionDetail('${session.id}')" title="View Session">
            <i class="material-symbols-rounded text-sm">visibility</i>
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// Display UX Analysis (Tab 4)
function displayUXAnalysis() {
  // Session Flow Metrics
  const flowMetrics = calculateFlowMetrics(currentEventsData);

  // Build flow metrics HTML - only show metrics for steps that are present in the trace
  let flowHtml = `
    <div class="mb-3">
      <small class="text-muted">Total Duration</small>
      <h6>${formatDuration(flowMetrics.totalDuration)}</h6>
    </div>
    <div class="mb-3">
      <small class="text-muted">Time to First Interaction</small>
      <h6>${flowMetrics.timeToFirstInteraction}s</h6>
    </div>
  `;

  // Only show Document Scan Time if scanning events are present
  if (flowMetrics.hasScanning) {
    flowHtml += `
    <div class="mb-3">
      <small class="text-muted">Document Scan Time</small>
      <h6>${flowMetrics.scanTime}s</h6>
    </div>
    `;
  }

  // Only show NFC Reading Time if reading events are present
  if (flowMetrics.hasReading) {
    flowHtml += `
    <div class="mb-3">
      <small class="text-muted">NFC Reading Time</small>
      <h6>${flowMetrics.readTime}s</h6>
    </div>
    `;
  }

  // Only show Face Verification Time if facial events are present
  if (flowMetrics.hasFacial) {
    flowHtml += `
    <div class="mb-3">
      <small class="text-muted">Face Verification Time</small>
      <h6>${flowMetrics.faceTime}s</h6>
    </div>
    `;
  }

  document.getElementById('session-flow-metrics').innerHTML = flowHtml;

  // Conversion Funnel - pass flow metrics to know which steps are present
  const funnel = buildConversionFunnel(currentEventsData, flowMetrics);
  document.getElementById('conversion-funnel').innerHTML = funnel;

  // Friction Analysis
  const frictionData = calculateFrictionScores(currentEventsData);
  const frictionTable = document.getElementById('friction-analysis-table');

  if (frictionData.length === 0) {
    frictionTable.innerHTML = '<tr><td colspan="6" class="text-center">No friction data available</td></tr>';
  } else {
    frictionTable.innerHTML = frictionData.map(step => {
      let issuesDisplay = step.issues.join(', ') || 'None';
      // Add face match score if available
      if (step.faceMatchScore !== null && step.faceMatchScore !== undefined) {
        const matchLevel = Math.round(step.faceMatchScore * 5); // Convert 0-1 to 0-5 scale
        issuesDisplay += ` | Match: ${matchLevel}/5 (${Math.round(step.faceMatchScore * 100)}%)`;
      }
      return `
        <tr>
          <td><span class="font-weight-bold">${step.name}</span></td>
          <td><span class="font-weight-bold">${step.score}</span></td>
          <td><span class="friction-${step.level.toLowerCase()}">${step.level}</span></td>
          <td><small>${issuesDisplay}</small></td>
          <td><small>${step.duration}s</small></td>
          <td><small>${step.attempts}</small></td>
        </tr>
      `;
    }).join('');
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

  // SDK Events Display
  displaySDKEvents(currentEventsData);
}

// Display SDK Events with visual timeline and performance journey
function displaySDKEvents(events) {
  if (!events || events.length === 0) {
    document.getElementById('sdk-events-timeline').innerHTML = '<p class="text-muted">No SDK events available</p>';
    document.getElementById('performance-journey').innerHTML = '<p class="text-muted">No journey data available</p>';
    document.getElementById('sdk-events-list').innerHTML = '<p class="text-muted">No event details available</p>';
    return;
  }

  // Update event count
  document.getElementById('sdk-events-count').textContent = events.length;

  // Calculate total duration
  const totalDuration = calculateSessionDuration(events);
  document.getElementById('sdk-total-duration').textContent = formatDuration(totalDuration);

  // Calculate SDK duration (sum of all event durations)
  let sdkDuration = 0;
  events.forEach(e => {
    if (e.duration) sdkDuration += e.duration;
  });
  document.getElementById('sdk-duration-display').textContent = formatMilliseconds(sdkDuration);

  // Build visual timeline (bar chart style)
  const timelineHtml = buildSDKEventsTimeline(events);
  document.getElementById('sdk-events-timeline').innerHTML = timelineHtml;

  // Build performance journey (circular nodes)
  const journeyHtml = buildPerformanceJourney(events);
  document.getElementById('performance-journey').innerHTML = journeyHtml;

  // Build event list (accordion style)
  const listHtml = buildSDKEventsList(events);
  document.getElementById('sdk-events-list').innerHTML = listHtml;
}

// Build SDK Events Timeline (visual bar chart)
function buildSDKEventsTimeline(events) {
  if (!events || events.length === 0) return '<p class="text-muted">No events</p>';

  // Find max duration for scaling
  const maxDuration = Math.max(...events.map(e => e.duration || 1), 1);

  let html = '<div class="sdk-events-visual">';

  events.forEach((event, index) => {
    const name = event.name || event.event || 'EVENT';
    const type = event.type || event.category || 'journey';
    const status = event.status || 'SUCCESS';
    const duration = event.duration || 0;
    const isFailure = status.toUpperCase() === 'FAILURE' || status.toUpperCase() === 'FAILED';

    // Calculate bar height based on duration (min 40px, max 150px)
    const minHeight = 40;
    const maxHeight = 150;
    const barHeight = Math.max(minHeight, Math.min(maxHeight, (duration / maxDuration) * maxHeight));

    const durationDisplay = formatMilliseconds(duration);

    html += `
      <div class="sdk-event-block" title="${name} - ${type} - ${durationDisplay}">
        <div class="sdk-event-bar ${isFailure ? 'failure' : ''}" style="height: ${barHeight}px;">
          ${durationDisplay}
        </div>
        <div class="sdk-event-label">${name} - ${type.substring(0, 4).toUpperCase()}</div>
        <div class="sdk-event-status"><span class="status-dot ${isFailure ? 'failure' : 'success'}"></span></div>
      </div>
    `;
  });

  // Add total flow badge
  const totalDuration = calculateSessionDuration(events);
  html += `
    <div class="d-flex flex-column align-items-center ms-4">
      <div class="journey-total-badge">Total Flow: ${formatDuration(totalDuration)}</div>
    </div>
  `;

  html += '</div>';
  return html;
}

// Build Performance Journey (circular nodes with connectors)
function buildPerformanceJourney(events) {
  if (!events || events.length === 0) return '<p class="text-muted">No journey data</p>';

  let html = '<div class="performance-journey-container">';

  events.forEach((event, index) => {
    const name = event.name || event.event || 'EVENT';
    const type = event.type || event.category || 'journey';
    const status = event.status || 'SUCCESS';
    const duration = event.duration || 0;
    const isFailure = status.toUpperCase() === 'FAILURE' || status.toUpperCase() === 'FAILED';

    // Add connector if not first element
    if (index > 0) {
      html += '<div class="journey-connector"></div>';
    }

    html += `
      <div class="journey-node">
        <div class="journey-node-circle ${isFailure ? 'failure' : ''}" title="${name} - ${formatMilliseconds(duration)}">
          ${isFailure ? '✗' : '✓'}
        </div>
        <div class="journey-node-label">${name} - ${type.substring(0, 3).toUpperCase()}...</div>
        <div class="journey-node-duration">${formatMilliseconds(duration)}</div>
      </div>
    `;
  });

  // Add total badge
  const totalDuration = calculateSessionDuration(events);
  html += `
    <div class="ms-4 d-flex align-items-center">
      <div class="journey-total-badge">Total: ${formatDuration(totalDuration)}</div>
    </div>
  `;

  html += '</div>';
  return html;
}

// Build SDK Events List (accordion style with expandable details)
function buildSDKEventsList(events) {
  if (!events || events.length === 0) return '<p class="text-muted">No events</p>';

  let html = '';

  events.forEach((event, index) => {
    const name = event.name || event.event || 'EVENT';
    const type = event.type || event.category || 'journey';
    const status = event.status || 'SUCCESS';
    const duration = event.duration || 0;
    const timestamp = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '-';
    const isFailure = status.toUpperCase() === 'FAILURE' || status.toUpperCase() === 'FAILED';
    const page = event.page || event.metadata?.page || '-';
    const documentType = event.documentType || event.metadata?.documentType || '-';
    const statusCode = event.statusCode || event.metadata?.statusCode || '-';
    const statusMessage = event.statusMessage || event.metadata?.statusMessage || '-';
    const sessionId = event.sessionId || event.metadata?.sessionId || '-';
    const deviceIdentifier = event.deviceIdentifier || event.metadata?.deviceIdentifier || '-';

    html += `
      <div class="sdk-event-item">
        <div class="sdk-event-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
          <div class="d-flex align-items-center">
            <span class="status-dot ${isFailure ? 'failure' : 'success'}"></span>
            <strong>${name}</strong>
            <span class="badge bg-secondary ms-2">${type}</span>
          </div>
          <div class="d-flex align-items-center">
            <small class="text-muted me-3">${timestamp}</small>
            <span class="badge ${isFailure ? 'bg-danger' : 'bg-success'}">${status}</span>
            <span class="text-info ms-2 font-weight-bold">+${formatMilliseconds(duration)}</span>
            <i class="material-symbols-rounded ms-2">expand_more</i>
          </div>
        </div>
        <div class="sdk-event-details" style="display: none;">
          <div class="row">
            <div class="col-md-3">
              <small class="text-muted">Page/Category</small>
              <p class="mb-0 font-weight-bold">${page}</p>
            </div>
            <div class="col-md-3">
              <small class="text-muted">Document Type</small>
              <p class="mb-0 font-weight-bold">${documentType}</p>
            </div>
            <div class="col-md-3">
              <small class="text-muted">Status Code</small>
              <p class="mb-0 font-weight-bold">${statusCode}</p>
            </div>
            <div class="col-md-3">
              <small class="text-muted">Duration</small>
              <p class="mb-0 font-weight-bold">${formatMilliseconds(duration)}</p>
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-md-6">
              <small class="text-muted">Session ID</small>
              <p class="mb-0 font-weight-bold text-truncate" title="${sessionId}">${sessionId}</p>
            </div>
            <div class="col-md-6">
              <small class="text-muted">Device Identifier</small>
              <p class="mb-0 font-weight-bold text-truncate" title="${deviceIdentifier}">${deviceIdentifier}</p>
            </div>
          </div>
          ${statusMessage !== '-' ? `
            <div class="mt-2">
              <small class="text-muted">Status Message</small>
              <p class="mb-0">${statusMessage}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  return html;
}

// Format milliseconds to human readable
function formatMilliseconds(ms) {
  if (!ms || ms === 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Calculate flow metrics - handles both Web SDK and Mobile SDK trace formats
function calculateFlowMetrics(events) {
  if (!events || events.length === 0) {
    return {
      totalDuration: 0,
      timeToFirstInteraction: 0,
      scanTime: 0,
      readTime: 0,
      faceTime: 0,
      hasScanning: false,
      hasReading: false,
      hasFacial: false
    };
  }

  const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Helper to find events - handles both Web SDK (event, category) and Mobile SDK (name, type, page) formats
  const findEvent = (nameOrEvent, categoryOrPage, status) => {
    return sortedEvents.find(e => {
      const eventName = (e.name || e.event || '').toUpperCase();
      const eventCategory = (e.category || e.type || e.page || '').toUpperCase();
      const eventStatus = (e.status || '').toUpperCase();

      const nameMatch = eventName === nameOrEvent.toUpperCase() ||
                        eventName.includes(nameOrEvent.toUpperCase());
      const categoryMatch = !categoryOrPage ||
                           eventCategory === categoryOrPage.toUpperCase() ||
                           eventCategory.includes(categoryOrPage.toUpperCase());
      const statusMatch = !status || eventStatus === status.toUpperCase();

      return nameMatch && categoryMatch && statusMatch;
    });
  };

  // Find step events - Web SDK uses: VIEW, START, COMPLETE, FINISH with categories like SCAN, ENROLLMENT
  const viewEvent = findEvent('VIEW', null, null);
  const startEvent = findEvent('START', null, null);
  const completeEvent = findEvent('COMPLETE', null, null);
  const finishEvent = findEvent('FINISH', null, null);

  // Check which steps are present in the trace
  const hasScanEvents = sortedEvents.some(e => {
    const cat = (e.category || e.type || e.page || '').toUpperCase();
    return cat === 'SCAN' || cat.includes('SCAN');
  });

  const hasReadEvents = sortedEvents.some(e => {
    const cat = (e.category || e.type || e.page || '').toUpperCase();
    return cat === 'READ' || cat === 'NFC' || cat.includes('READ');
  });

  const hasFaceEvents = sortedEvents.some(e => {
    const cat = (e.category || e.type || e.page || '').toUpperCase();
    const name = (e.name || e.event || '').toUpperCase();
    return cat === 'FACE' || cat === 'FACIAL' || cat === 'BIOMETRIC' ||
           name.includes('FACE') || name.includes('LIVENESS');
  });

  // Calculate durations using event timestamps or duration field
  let scanTime = 0;
  let readTime = 0;
  let faceTime = 0;

  // Method 1: Sum durations from events with matching categories
  sortedEvents.forEach(e => {
    const cat = (e.category || e.type || e.page || '').toUpperCase();
    const duration = e.duration || 0;

    if (cat === 'SCAN' || cat.includes('SCAN')) {
      scanTime += duration;
    } else if (cat === 'READ' || cat === 'NFC' || cat.includes('READ')) {
      readTime += duration;
    } else if (cat === 'FACE' || cat === 'FACIAL' || cat === 'BIOMETRIC') {
      faceTime += duration;
    }
  });

  // Convert to seconds
  scanTime = Math.round(scanTime / 1000);
  readTime = Math.round(readTime / 1000);
  faceTime = Math.round(faceTime / 1000);

  // Calculate time to first interaction
  let timeToFirstInteraction = 0;
  if (viewEvent && startEvent) {
    timeToFirstInteraction = Math.floor((new Date(startEvent.timestamp) - new Date(viewEvent.timestamp)) / 1000);
  } else if (sortedEvents.length >= 2) {
    timeToFirstInteraction = Math.floor((new Date(sortedEvents[1].timestamp) - new Date(sortedEvents[0].timestamp)) / 1000);
  }

  return {
    totalDuration: calculateSessionDuration(events),
    timeToFirstInteraction: Math.max(0, timeToFirstInteraction),
    scanTime: scanTime,
    readTime: readTime,
    faceTime: faceTime,
    hasScanning: hasScanEvents,
    hasReading: hasReadEvents,
    hasFacial: hasFaceEvents
  };
}

// Build conversion funnel - dynamically shows only steps present in trace
function buildConversionFunnel(events, flowMetrics = null) {
  // Build dynamic steps list based on what's present in the trace
  let steps = ['START'];

  // Helper to check if step is present - handles both Web SDK and Mobile SDK formats
  const isStepPresent = (stepName) => {
    return events.some(e => {
      const name = (e.name || e.event || '').toUpperCase();
      const category = (e.category || e.type || e.page || '').toUpperCase();
      const page = (e.page || '').toUpperCase();

      return name.includes(stepName) || category === stepName || page === stepName ||
             category.includes(stepName) || page.includes(stepName);
    });
  };

  // Check for scanning step
  if (flowMetrics?.hasScanning || isStepPresent('SCAN')) {
    steps.push('SCAN');
  }

  // Check for reading/NFC step
  if (flowMetrics?.hasReading || isStepPresent('READ') || isStepPresent('NFC')) {
    steps.push('READ');
  }

  // Check for face/facial step - only add if present
  if (flowMetrics?.hasFacial || isStepPresent('FACE') || isStepPresent('FACIAL') || isStepPresent('LIVENESS')) {
    steps.push('FACE');
  }

  // Always add FINISH/COMPLETE
  steps.push('FINISH');

  let html = '';

  steps.forEach((step, index) => {
    // Check for success/failure - handle multiple naming conventions
    const hasSuccess = events.some(e => {
      const name = (e.name || e.event || '').toUpperCase();
      const category = (e.category || e.type || e.page || '').toUpperCase();
      const page = (e.page || '').toUpperCase();
      const status = (e.status || '').toUpperCase();

      const matchesStep = name.includes(step) || category === step || page === step ||
                          category.includes(step) || page.includes(step) ||
                          (step === 'START' && (name === 'START' || name === 'VIEW')) ||
                          (step === 'FINISH' && (name === 'FINISH' || name === 'COMPLETE'));

      return matchesStep && (status === 'SUCCESS' || status === 'COMPLETED');
    });

    const hasFail = events.some(e => {
      const name = (e.name || e.event || '').toUpperCase();
      const category = (e.category || e.type || e.page || '').toUpperCase();
      const page = (e.page || '').toUpperCase();
      const status = (e.status || '').toUpperCase();

      const matchesStep = name.includes(step) || category === step || page === step ||
                          category.includes(step) || page.includes(step);

      return matchesStep && (status === 'FAILURE' || status === 'FAILED' || status === 'ERROR');
    });

    const status = hasSuccess ? 'completed' : hasFail ? 'failed' : 'pending';
    const icon = status === 'completed' ? 'check' : status === 'failed' ? 'close' : 'remove';

    // Use more user-friendly display names
    const displayName = step === 'READ' ? 'NFC' : step;

    html += `
      <div class="progress-step">
        <div class="progress-step-icon progress-step-${status}">
          <i class="material-symbols-rounded" style="font-size: 14px;">${icon}</i>
        </div>
        <span>${displayName}</span>
      </div>
    `;
  });

  return html;
}

// Calculate friction scores - handles both Web SDK and Mobile SDK formats
function calculateFrictionScores(events) {
  // Define step patterns - each step can match multiple naming conventions
  const stepPatterns = [
    { name: 'SCAN', patterns: ['SCAN', 'SCANNING', 'DOCUMENT_SCAN'] },
    { name: 'READ', patterns: ['READ', 'NFC', 'NFC_READ', 'NFC_READING', 'READING'] },
    { name: 'FACE', patterns: ['FACE', 'FACIAL', 'LIVENESS', 'FACE_MATCH', 'BIOMETRIC'] }
  ];

  const results = [];

  stepPatterns.forEach(({ name: stepName, patterns }) => {
    // Filter events that match any of the patterns - handles Web SDK (event, category) and Mobile SDK (name, page)
    const stepEvents = events.filter(e => {
      const eventName = (e.name || e.event || '').toUpperCase();
      const category = (e.category || e.type || '').toUpperCase();
      const page = (e.page || '').toUpperCase();

      return patterns.some(pattern =>
        eventName.includes(pattern) || category === pattern || page === pattern ||
        category.includes(pattern) || page.includes(pattern)
      );
    });

    // Skip if no events found for this step
    if (stepEvents.length === 0) return;

    // Count attempts - look for START events or any events in the category
    const attempts = stepEvents.filter(e => {
      const status = (e.status || '').toUpperCase();
      return status === 'START' || status === 'STARTED';
    }).length || 1;

    // Collect issues from failure events
    const issues = stepEvents.filter(e => {
      const status = (e.status || '').toUpperCase();
      return status === 'FAILURE' || status === 'FAILED' || status === 'ERROR';
    }).map(e => e.statusCode || e.statusMessage || 'Failed');

    // Calculate duration from event durations
    let duration = 0;
    stepEvents.forEach(e => {
      duration += (e.duration || 0) / 1000; // Convert ms to seconds
    });

    // Extract face match score if this is FACE step
    let faceMatchScore = null;
    if (stepName === 'FACE') {
      const faceEvent = stepEvents.find(e =>
        e.details?.score !== undefined ||
        e.faceMatchScore !== undefined ||
        e.livenessScore !== undefined
      );
      if (faceEvent) {
        faceMatchScore = faceEvent.details?.score ?? faceEvent.faceMatchScore ?? faceEvent.livenessScore;
      }
    }

    const attemptPenalty = (attempts - 1) * 20;
    const durationPenalty = Math.max(0, (duration / 30 - 1)) * 30; // 30s benchmark
    const issuePenalty = issues.length * 10;

    const score = Math.round(attemptPenalty + durationPenalty + issuePenalty);
    const level = score > 70 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW';

    // Use user-friendly display names
    const displayName = stepName === 'READ' ? 'NFC Read' : stepName === 'FACE' ? 'Face Verification' : 'Document Scan';

    results.push({
      name: displayName,
      score,
      level,
      issues: [...new Set(issues)],
      duration: Math.round(duration),
      attempts,
      faceMatchScore
    });
  });

  return results;
}

// Calculate environment issues - handles both statusCode and statusMessage
function calculateEnvironmentIssues(events) {
  // Helper to check if event matches any of the patterns
  const matchesPattern = (e, patterns) => {
    const code = (e.statusCode || '').toUpperCase();
    const message = (e.statusMessage || '').toUpperCase();
    return patterns.some(p => code.includes(p) || message.includes(p));
  };

  return {
    dark: events.filter(e => matchesPattern(e, ['DARK', 'LOW_LIGHT', 'LIGHTING'])).length,
    blur: events.filter(e => matchesPattern(e, ['BLUR', 'BLURRY', 'OUT_OF_FOCUS'])).length,
    glare: events.filter(e => matchesPattern(e, ['GLARE', 'REFLECTION', 'BRIGHT'])).length,
    position: events.filter(e => matchesPattern(e, ['POSITION', 'ALIGN', 'CENTER', 'TILT'])).length,
    distance: events.filter(e => matchesPattern(e, ['DISTANCE', 'TOO_FAR', 'TOO_CLOSE', 'ZOOM'])).length
  };
}

// Format time for display
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ========================================
// SESSIONS LIST FUNCTIONALITY
// ========================================

let sessionsListData = [];
let currentPage = 1;
let autoRefreshInterval = null;
let statusBarChart = null;
let sessionLineChart = null;
let radarChart = null;

// Load sessions list
async function loadSessionsList(page = 1) {
  try {
    currentPage = page;

    // Try to fetch from sdk_sessions table first, fallback to accounts
    let response = await api.getSdkSessions({
      page: page,
      limit: 20,
      sort: 'created_at',
      order: 'desc'
    });

    // Fallback to accounts if sdk_sessions is empty or fails
    if (!response.success || !response.data || response.data.length === 0) {
      console.log('📊 Falling back to accounts table for sessions');
      response = await api.getAccounts({
        page: page,
        limit: 20,
        sort: 'created_at',
        order: 'desc'
      });
    }

    if (!response.success) {
      document.getElementById('sessions-table-body').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading sessions</td></tr>';
      return;
    }

    sessionsListData = response.data;

    // Update summary cards
    updateSummaryCards(sessionsListData);

    // Build table
    buildSessionsTable(sessionsListData);

    // Update pagination
    if (response.pagination) {
      const paginationHtml = buildPagination(response.pagination, loadSessionsList);
      document.getElementById('sessions-pagination-container').innerHTML = paginationHtml;
      attachPaginationListeners('sessions-pagination-container', loadSessionsList);
    }

  } catch (error) {
    console.error('Error loading sessions:', error);
    document.getElementById('sessions-table-body').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading sessions</td></tr>';
  }
}

// Update summary cards
function updateSummaryCards(sessions) {
  const total = sessions.length;
  const successful = sessions.filter(s => s.verification_status === 'APPROVED' || s.status === 'approved').length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

  // Calculate average duration from sdk_analytics
  let totalDuration = 0;
  let durationsCount = 0;

  sessions.forEach(session => {
    if (session.sdk_analytics) {
      try {
        const analytics = typeof session.sdk_analytics === 'string' ? JSON.parse(session.sdk_analytics) : session.sdk_analytics;
        if (analytics.events && analytics.events.length > 0) {
          const duration = calculateSessionDuration(analytics.events);
          if (duration > 0) {
            totalDuration += duration;
            durationsCount++;
          }
        }
      } catch (e) {
        // Skip invalid analytics
      }
    }
  });

  const avgDuration = durationsCount > 0 ? Math.round(totalDuration / durationsCount) : 0;

  // Count active sessions (created in last 5 minutes)
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  const activeSessions = sessions.filter(s => {
    const created = new Date(s.created_at).getTime();
    return created > fiveMinutesAgo && !s.verification_status;
  }).length;

  document.getElementById('total-sessions-count').textContent = total;
  document.getElementById('success-rate').textContent = `${successRate}%`;
  document.getElementById('avg-duration').textContent = formatDuration(avgDuration);
  document.getElementById('active-sessions').textContent = activeSessions;

  // Update charts
  updateCharts(sessions);
}

// Update charts with session data
function updateCharts(sessions) {
  // Status Bar Chart
  const statusCounts = {
    'APPROVED': 0,
    'REJECTED': 0,
    'PENDING': 0
  };

  sessions.forEach(session => {
    const status = (session.verification_status || session.status || 'PENDING').toUpperCase();
    if (status.includes('APPROVED') || status === 'APPROVED') {
      statusCounts.APPROVED++;
    } else if (status.includes('REJECTED') || status === 'REJECTED') {
      statusCounts.REJECTED++;
    } else {
      statusCounts.PENDING++;
    }
  });

  // Destroy existing chart if it exists
  if (statusBarChart) {
    statusBarChart.destroy();
  }

  const barCtx = document.getElementById('statusBarChart');
  if (barCtx) {
    statusBarChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Approved', 'Rejected', 'Pending'],
        datasets: [{
          label: 'Sessions',
          data: [statusCounts.APPROVED, statusCounts.REJECTED, statusCounts.PENDING],
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  // Average Duration Chart - group by hour for last 24 hours
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Filter sessions from last 24 hours
  const recentSessions = sessions.filter(session => {
    const sessionTime = new Date(session.created_at);
    return sessionTime >= last24Hours;
  });

  // Group by hour and calculate average duration
  const hourlyDurations = {};
  recentSessions.forEach(session => {
    const sessionTime = new Date(session.created_at);
    const hourKey = sessionTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ':00';

    if (!hourlyDurations[hourKey]) {
      hourlyDurations[hourKey] = { total: 0, count: 0 };
    }

    // Calculate duration from sdk_analytics
    if (session.sdk_analytics) {
      try {
        const analytics = typeof session.sdk_analytics === 'string' ? JSON.parse(session.sdk_analytics) : session.sdk_analytics;
        const events = Array.isArray(analytics) ? analytics : analytics.events || [];
        if (events.length > 0) {
          const duration = calculateSessionDuration(events);
          if (duration > 0) {
            hourlyDurations[hourKey].total += duration;
            hourlyDurations[hourKey].count++;
          }
        }
      } catch (e) {}
    }
  });

  // Generate all 24 hours labels
  const hours = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    hours.push(hour.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ':00');
  }

  const avgDurations = hours.map(hour => {
    const data = hourlyDurations[hour];
    return data && data.count > 0 ? Math.round(data.total / data.count) : 0;
  });

  // Destroy existing chart if it exists
  if (sessionLineChart) {
    sessionLineChart.destroy();
  }

  const lineCtx = document.getElementById('avgDurationChart');
  if (lineCtx) {
    sessionLineChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [{
          label: 'Avg Duration (seconds)',
          data: avgDurations,
          borderColor: 'rgba(26, 115, 232, 1)',
          backgroundColor: 'rgba(26, 115, 232, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Avg: ${context.raw}s`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Seconds'
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });
  }
}

// Build sessions table with journey visualization
function buildSessionsTable(sessions) {
  const tableBody = document.getElementById('sessions-table-body');

  if (sessions.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No sessions found</td></tr>';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('sessions-list-view').style.display = 'none';
    return;
  }

  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('sessions-list-view').style.display = 'block';

  // Log sessions for debugging
  console.log(`📊 Building table with ${sessions.length} sessions`);

  tableBody.innerHTML = sessions.map((session, index) => {
    try {
      // Parse SDK data
      let sdkSource = {};
      let documentType = 'Unknown';
      let duration = 0;
      let platform = 'Unknown';
      let sessionId = 'N/A';
      let events = [];

    if (session.sdk_source) {
      try {
        sdkSource = typeof session.sdk_source === 'string' ? JSON.parse(session.sdk_source) : session.sdk_source;
        platform = sdkSource.devicePlatform || 'Unknown';
        sessionId = sdkSource.sessionId || session.id.substring(0, 8);
      } catch (e) {}
    }

    // Use document_type column first (from database)
    if (session.document_type) {
      documentType = session.document_type;
    }

    // Extract trace events from multiple sources
    // Priority 1: sdk_analytics
    if (session.sdk_analytics) {
      try {
        const analytics = typeof session.sdk_analytics === 'string' ? JSON.parse(session.sdk_analytics) : session.sdk_analytics;

        // Get events array (handle both formats)
        if (Array.isArray(analytics)) {
          events = analytics;
        } else if (analytics.events && Array.isArray(analytics.events)) {
          events = analytics.events;
        }
      } catch (e) {
        console.error('Error parsing sdk_analytics:', e);
      }
    }

    // Priority 2: sdk_trace (raw trace from SDK)
    if (events.length === 0 && session.sdk_trace) {
      try {
        const trace = typeof session.sdk_trace === 'string' ? JSON.parse(session.sdk_trace) : session.sdk_trace;
        events = Array.isArray(trace) ? trace : [];
      } catch (e) {
        console.error('Error parsing sdk_trace:', e);
      }
    }

    // Calculate duration from events
    if (events.length > 0) {
      duration = calculateSessionDuration(events);

      // Extract document type from events if not already set
      if (documentType === 'Unknown') {
        // Try START event's id field
        const startEvent = events.find(e => (e.name || e.event) === 'START');
        if (startEvent && startEvent.id && startEvent.id !== 'START') {
          documentType = startEvent.id; // e.g., "GENERIC_ID", "UAE_ID", etc.
        } else {
          // Fallback to metadata or documentType property
          const eventWithDoc = events.find(e => e.metadata?.documentType || e.documentType);
          if (eventWithDoc) {
            documentType = eventWithDoc.metadata?.documentType || eventWithDoc.documentType || 'Unknown';
          }
        }
      }
    }

    // Also check sdk_verifications for document type
    if (documentType === 'Unknown' && session.sdk_verifications) {
      try {
        let verifications = typeof session.sdk_verifications === 'string' ? JSON.parse(session.sdk_verifications) : session.sdk_verifications;
        // Handle array format
        if (Array.isArray(verifications) && verifications.length > 0) {
          verifications = verifications[0];
        }
        if (verifications.documentType) {
          documentType = verifications.documentType;
        }
      } catch (e) {}
    }

    // Calculate Total Risk Score from Journey Fraud Flags
    const totalRiskScore = calculateTotalRiskScoreForTable(session);
    const totalRiskClass = getTotalRiskClass(totalRiskScore);
    const riskDetails = totalRiskScore >= 200 ? 'High Risk - Reject' : totalRiskScore >= 50 ? 'Medium Risk - Review' : 'Low Risk - Approve';

    // Calculate UX Score
    const uxScore = calculateUXScore(events);

    // Get device identifier for history lookup
    const deviceIdentifier = sdkSource.deviceIdentifier || null;

    // Get full session ID (JTI from SDK source or account ID)
    const fullSessionId = sdkSource.jti || sdkSource.sessionId || session.id;

    // Format timestamp with date and time
    const timestamp = new Date(session.created_at);
    const formattedTimestamp = timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return `
      <tr>
        <td>
          <div class="d-flex flex-column justify-content-center px-2">
            <h6 class="mb-0 text-xs font-weight-bold text-monospace" style="font-family: monospace; word-break: break-all;">${fullSessionId}</h6>
            <p class="text-xs text-secondary mb-0">${session.first_name || ''} ${session.last_name || ''}</p>
          </div>
        </td>
        <td>
          <span class="badge badge-sm bg-gradient-primary">${formatDocumentType(documentType)}</span>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <i class="material-symbols-rounded text-info me-1" style="font-size: 18px;">schedule</i>
            <span class="text-sm font-weight-bold">${formatDuration(duration)}</span>
          </div>
        </td>
        <td>
          <span class="badge badge-sm bg-${totalRiskClass}" data-bs-toggle="tooltip" data-bs-placement="top" title="${riskDetails}">${totalRiskScore}</span>
        </td>
        <td>
          <span data-bs-toggle="tooltip" data-bs-placement="top" title="${uxScore.details}" style="cursor: help; font-size: 1.2rem;">${uxScore.emoji}</span>
          <small class="ms-1 text-muted">${uxScore.score}</small>
        </td>
        <td>
          ${deviceIdentifier ? `
          <div class="d-flex align-items-center">
            <span class="badge badge-sm bg-secondary device-history-badge" data-device-id="${deviceIdentifier}" data-session-id="${session.id}">
              <i class="material-symbols-rounded me-1" style="font-size: 12px;">devices</i>
              <span class="device-count">...</span>
            </span>
            <button class="btn btn-link btn-sm p-0 ms-1 text-danger" onclick="addDeviceToBlocklist('${deviceIdentifier}')" title="Add to Blocklist" style="font-size: 12px;">
              <i class="material-symbols-rounded" style="font-size: 14px;">block</i>
            </button>
          </div>
          ` : '<span class="text-muted text-xs">N/A</span>'}
        </td>
        <td>
          <p class="text-xs mb-0 font-weight-bold">${formattedTimestamp}</p>
        </td>
        <td class="align-middle">
          <button class="btn btn-link text-info text-gradient px-2 mb-0" onclick="viewFullSessionDetail('${session.id}')" title="View Full Details">
            <i class="material-symbols-rounded text-sm">visibility</i>
            View
          </button>
        </td>
      </tr>
    `;
    } catch (error) {
      console.error(`❌ Error building row for session ${session?.id || index}:`, error, session);
      // Return a basic row with error indication
      return `
      <tr>
        <td colspan="8" class="text-danger">
          <small>Error loading session ${session?.id?.substring(0, 8) || index} - ${error.message}</small>
        </td>
      </tr>
      `;
    }
  }).join('');

  // Initialize Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Load device history counts for each device badge
  loadDeviceHistoryCounts();
}

// Load device history counts for the table
async function loadDeviceHistoryCounts() {
  const badges = document.querySelectorAll('.device-history-badge');

  for (const badge of badges) {
    const deviceId = badge.dataset.deviceId;
    const sessionId = badge.dataset.sessionId;

    if (!deviceId) continue;

    try {
      const response = await api.getDeviceHistoryFromSessions(deviceId, sessionId);
      if (response.success && response.data) {
        const count = response.data.totalSessions || 0;
        const countSpan = badge.querySelector('.device-count');
        if (countSpan) {
          countSpan.textContent = count;

          // Update badge color based on count
          badge.classList.remove('bg-secondary', 'bg-warning', 'bg-danger');
          if (count > 5) {
            badge.classList.add('bg-danger');
            badge.setAttribute('title', `${count} sessions from this device - High risk`);
          } else if (count > 2) {
            badge.classList.add('bg-warning');
            badge.setAttribute('title', `${count} sessions from this device - Medium risk`);
          } else {
            badge.classList.add('bg-secondary');
            badge.setAttribute('title', `${count} sessions from this device`);
          }
        }
      }
    } catch (error) {
      console.error('Error loading device history:', error);
      const countSpan = badge.querySelector('.device-count');
      if (countSpan) countSpan.textContent = '?';
    }
  }
}

// Add device to blocklist
async function addDeviceToBlocklist(deviceIdentifier) {
  if (!deviceIdentifier) {
    showError('No device identifier available');
    return;
  }

  if (!confirm(`Are you sure you want to add device "${deviceIdentifier.substring(0, 20)}..." to the blocklist?`)) {
    return;
  }

  try {
    // TODO: Implement blocklist API endpoint
    // const response = await api.addToBlocklist({ type: 'device', value: deviceIdentifier });
    // if (response.success) {
    //   showSuccess('Device added to blocklist');
    // }

    // For now, show a message that this feature is coming soon
    showError('Blocklist feature coming soon. Device ID: ' + deviceIdentifier.substring(0, 20) + '...');
  } catch (error) {
    console.error('Error adding device to blocklist:', error);
    showError('Failed to add device to blocklist');
  }
}

// View session detail (keeps existing functionality)
function viewSessionDetail(accountId) {
  // Navigate to detail view with account data
  loadAccountAsSession(accountId);
}

// Open session modal with radar chart
async function openSessionModal(accountId) {
  try {
    // Fetch account details
    const response = await api.getAccountById(accountId);

    if (!response.success) {
      showError('Session not found');
      return;
    }

    const session = response.data;

    // Parse SDK data
    let sdkAnalytics = {};
    let sdkSource = {};
    let verifications = {};

    if (session.sdk_analytics) {
      try {
        sdkAnalytics = typeof session.sdk_analytics === 'string' ? JSON.parse(session.sdk_analytics) : session.sdk_analytics;
      } catch (e) {}
    }

    if (session.sdk_source) {
      try {
        sdkSource = typeof session.sdk_source === 'string' ? JSON.parse(session.sdk_source) : session.sdk_source;
      } catch (e) {}
    }

    if (session.sdk_verifications) {
      try {
        verifications = typeof session.sdk_verifications === 'string' ? JSON.parse(session.sdk_verifications) : session.sdk_verifications;
        // If sdk_verifications is an array, get the first element
        if (Array.isArray(verifications) && verifications.length > 0) {
          verifications = verifications[0];
        }
      } catch (e) {
        console.error('Error parsing sdk_verifications:', e);
      }
    }

    // Also try fraud_scores column as fallback or merge
    if (session.fraud_scores) {
      try {
        const fraudScores = typeof session.fraud_scores === 'string' ? JSON.parse(session.fraud_scores) : session.fraud_scores;
        verifications = { ...verifications, ...fraudScores };
      } catch (e) {
        console.error('Error parsing fraud_scores:', e);
      }
    }

    // Calculate duration from trace events
    let events = [];
    // Priority 1: sdk_analytics
    if (sdkAnalytics) {
      events = Array.isArray(sdkAnalytics) ? sdkAnalytics : sdkAnalytics.events || [];
    }
    // Priority 2: sdk_trace (raw trace from SDK)
    if (events.length === 0 && session.sdk_trace) {
      try {
        const trace = typeof session.sdk_trace === 'string' ? JSON.parse(session.sdk_trace) : session.sdk_trace;
        events = Array.isArray(trace) ? trace : [];
      } catch (e) {
        console.error('Error parsing sdk_trace:', e);
      }
    }

    // Populate modal data
    document.getElementById('modal-session-id').textContent = session.id;
    document.getElementById('modal-account-name').textContent = `${session.first_name || ''} ${session.last_name || ''}`;
    document.getElementById('modal-email').textContent = session.email || 'N/A';
    document.getElementById('modal-doc-type').textContent = formatDocumentType(session.document_type || verifications.documentType || 'Unknown');
    document.getElementById('modal-status').innerHTML = `<span class="badge bg-${session.verification_status === 'APPROVED' ? 'success' : session.verification_status === 'REJECTED' ? 'danger' : 'warning'}">${session.verification_status || 'PENDING'}</span>`;
    document.getElementById('modal-platform').textContent = sdkSource.devicePlatform || 'Unknown';

    // Calculate duration from trace events
    const duration = calculateSessionDuration(events);
    document.getElementById('modal-duration').textContent = formatDuration(duration);
    document.getElementById('modal-created').textContent = formatDate(new Date(session.created_at));

    // Build verification details
    let verificationHtml = '';
    if (verifications && Object.keys(verifications).length > 0) {
      verificationHtml = '<div class="row">';

      // Basic verification fields
      const verificationFields = {
        'faceMatchLevel': 'Face Match Level',
        'mrzValid': 'MRZ Valid',
        'documentValid': 'Document Valid',
        'livenessLevel': 'Liveness Level',
        'dataConsistency': 'Data Consistency'
      };

      for (const [key, label] of Object.entries(verificationFields)) {
        if (verifications[key] !== undefined) {
          const value = verifications[key];
          const displayValue = typeof value === 'boolean' ? (value ? '✓ Yes' : '✗ No') : value;
          const colorClass = typeof value === 'boolean' ? (value ? 'text-success' : 'text-danger') : '';
          verificationHtml += `
            <div class="col-6 mb-2">
              <small class="text-muted">${label}</small>
              <p class="mb-0 font-weight-bold ${colorClass}">${displayValue}</p>
            </div>
          `;
        }
      }

      verificationHtml += '</div>';

      // Add source detection info
      if (verifications.sourceDetection?.enabled) {
        verificationHtml += '<hr class="my-3"><h6 class="mb-2">Source Detection</h6><div class="row">';

        const optimal = verifications.sourceDetection.optimalResolution;
        const allowNonPhysical = verifications.sourceDetection.allowNonPhysicalDocuments;
        const selectedRes = verifications.sourceDetection.selectedResolution;
        const optimalRes = verifications.sourceDetection.optimalResolution;

        verificationHtml += `
          <div class="col-6 mb-2">
            <small class="text-muted">Resolution Quality</small>
            <p class="mb-0 font-weight-bold ${optimal ? 'text-success' : 'text-warning'}">${optimal ? '✓ Optimal' : '⚠️ Sub-optimal'}</p>
          </div>
          <div class="col-6 mb-2">
            <small class="text-muted">Selected Resolution</small>
            <p class="mb-0">${selectedRes || 'N/A'}</p>
          </div>
          <div class="col-6 mb-2">
            <small class="text-muted">Physical Document</small>
            <p class="mb-0 font-weight-bold ${allowNonPhysical ? 'text-warning' : 'text-success'}">${allowNonPhysical ? '⚠️ Allowed' : '✓ Required'}</p>
          </div>
        `;

        verificationHtml += '</div>';
      }

      // Add fraud detection scores if available
      const hasFraudScores = verifications.idScreenDetection || verifications.idPrintDetection || verifications.idPhotoTamperingDetection;
      if (hasFraudScores) {
        verificationHtml += '<hr class="my-3"><h6 class="mb-2">Fraud Detection Scores</h6><div class="row">';

        if (verifications.idScreenDetection?.enabled) {
          const score = verifications.idScreenDetection.score;
          const colorClass = score > 50 ? 'text-danger' : score > 30 ? 'text-warning' : 'text-success';
          verificationHtml += `
            <div class="col-6 mb-2">
              <small class="text-muted">🖥️ Screen Detection</small>
              <p class="mb-0 font-weight-bold ${colorClass}">${score}/100 ${score > 50 ? '⚠️' : '✓'}</p>
              <small class="text-xs text-muted">${score > 50 ? 'High risk: Document may be on screen' : 'Low risk: Physical document'}</small>
            </div>
          `;
        }

        if (verifications.idPrintDetection?.enabled) {
          const score = verifications.idPrintDetection.score;
          const colorClass = score > 50 ? 'text-danger' : score > 30 ? 'text-warning' : 'text-success';
          verificationHtml += `
            <div class="col-6 mb-2">
              <small class="text-muted">🖨️ Print Detection</small>
              <p class="mb-0 font-weight-bold ${colorClass}">${score}/100 ${score > 50 ? '⚠️' : '✓'}</p>
              <small class="text-xs text-muted">${score > 50 ? 'High risk: Printed copy detected' : 'Low risk: Original document'}</small>
            </div>
          `;
        }

        if (verifications.idPhotoTamperingDetection?.enabled) {
          const score = verifications.idPhotoTamperingDetection.score;
          const colorClass = score > 70 ? 'text-danger' : score > 40 ? 'text-warning' : 'text-success';
          verificationHtml += `
            <div class="col-6 mb-2">
              <small class="text-muted">📸 Photo Tampering</small>
              <p class="mb-0 font-weight-bold ${colorClass}">${score}/100 ${score > 70 ? '⚠️' : '✓'}</p>
              <small class="text-xs text-muted">${score > 70 ? 'High risk: Photo may be tampered' : 'Low risk: Original photo'}</small>
            </div>
          `;
        }

        verificationHtml += '</div>';
      }
    } else {
      verificationHtml = '<p class="text-muted">No verification data available</p>';
    }
    document.getElementById('modal-verification-details').innerHTML = verificationHtml;

    // Create radar chart
    createRadarChart(verifications);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('sessionDetailModal'));
    modal.show();

    // Store session ID for "View Full Details" button
    window.currentModalSessionId = session.id;

  } catch (error) {
    console.error('Error opening session modal:', error);
    showError('Error loading session data');
  }
}

// Create radar chart for verification scores
function createRadarChart(verifications) {
  // Destroy existing chart
  if (radarChart) {
    radarChart.destroy();
  }

  const canvas = document.getElementById('verificationRadarChart');
  if (!canvas) return;

  // Extract scores from verifications
  const scores = {
    'Face Match': 0,
    'Liveness': 0,
    'MRZ Valid': 0,
    'Document Valid': 0,
    'Data Consistency': 0,
    'Screen Detection': 0,
    'Print Detection': 0,
    'Photo Tampering': 0,
    'Overall Quality': 0
  };

  if (verifications) {
    console.log('Creating radar chart with verifications:', verifications);

    // Face Match Level - try multiple sources
    // 1. faceMatchLevel (direct property, 0-5 scale)
    if (verifications.faceMatchLevel !== undefined) {
      scores['Face Match'] = (verifications.faceMatchLevel / 5) * 100;
    }
    // 2. biometric.matchLevel (from SDK verification, 0-5 scale)
    else if (verifications.biometric?.matchLevel !== undefined) {
      scores['Face Match'] = (verifications.biometric.matchLevel / 5) * 100;
    }

    // Liveness Level - try multiple sources
    // 1. livenessLevel (direct property, 0-5 scale)
    if (verifications.livenessLevel !== undefined) {
      scores['Liveness'] = (verifications.livenessLevel / 5) * 100;
    }
    // 2. liveness.live (boolean from SDK)
    else if (verifications.liveness?.live !== undefined) {
      scores['Liveness'] = verifications.liveness.live ? 100 : 0;
    }

    // Boolean checks (convert to 0 or 100)
    if (verifications.mrzValid !== undefined) {
      scores['MRZ Valid'] = verifications.mrzValid ? 100 : 0;
    } else if (verifications.mrzChecksum?.valid !== undefined) {
      scores['MRZ Valid'] = verifications.mrzChecksum.valid ? 100 : 0;
    }

    if (verifications.documentValid !== undefined) {
      scores['Document Valid'] = verifications.documentValid ? 100 : 0;
    }

    // Data Consistency - check multiple sources
    if (verifications.dataConsistency !== undefined) {
      scores['Data Consistency'] = verifications.dataConsistency ? 100 : 0;
    } else if (verifications.dataConsistencyCheck?.enabled) {
      // Check if all fields match
      const fields = verifications.dataConsistencyCheck.fields || [];
      const allMatch = fields.length === 0 || fields.every(f => f.match === 'MATCH');
      scores['Data Consistency'] = allMatch ? 100 : 0;
    }

    // Fraud Detection Scores (0-100, inverted so lower fraud score = higher trust score)
    // Higher fraud scores mean more suspicious, so we invert them for the radar chart
    // This shows "trust" where 100 = fully trusted, 0 = highly suspicious
    if (verifications.idScreenDetection?.enabled && verifications.idScreenDetection.score !== undefined) {
      const fraudScore = verifications.idScreenDetection.score;
      scores['Screen Detection'] = Math.max(0, 100 - fraudScore);
      console.log(`Screen Detection: fraud=${fraudScore}, trust=${scores['Screen Detection']}`);
    }

    if (verifications.idPrintDetection?.enabled && verifications.idPrintDetection.score !== undefined) {
      const fraudScore = verifications.idPrintDetection.score;
      scores['Print Detection'] = Math.max(0, 100 - fraudScore);
      console.log(`Print Detection: fraud=${fraudScore}, trust=${scores['Print Detection']}`);
    }

    if (verifications.idPhotoTamperingDetection?.enabled && verifications.idPhotoTamperingDetection.score !== undefined) {
      const fraudScore = verifications.idPhotoTamperingDetection.score;
      scores['Photo Tampering'] = Math.max(0, 100 - fraudScore);
      console.log(`Photo Tampering: fraud=${fraudScore}, trust=${scores['Photo Tampering']}`);
    }

    // Overall quality score (average of all non-zero scores)
    const values = Object.values(scores).filter(v => v > 0);
    if (values.length > 0) {
      scores['Overall Quality'] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }

    console.log('Final radar chart scores:', scores);
  }

  const labels = Object.keys(scores);
  const data = Object.values(scores);

  radarChart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Verification Scores',
        data: data,
        backgroundColor: 'rgba(26, 115, 232, 0.2)',
        borderColor: 'rgba(26, 115, 232, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(26, 115, 232, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(26, 115, 232, 1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent'
          },
          pointLabels: {
            font: {
              size: 12
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  });
}

// View full session detail (navigate to full view)
// Can be called with sessionId directly or from modal (uses window.currentModalSessionId)
async function viewFullSessionDetail(sessionId) {
  const id = sessionId || window.currentModalSessionId;

  if (id) {
    // Close modal if open
    const modalElement = document.getElementById('sessionDetailModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    // Load full session view - try SDK session first, then fall back to account
    await loadSdkSession(id);
  }
}

// Load SDK session data
async function loadSdkSession(sessionId) {
  try {
    showLoading();

    // First try to load as SDK session
    const response = await api.getSdkSessionById(sessionId);

    if (response.success && response.data) {
      const session = response.data;

      // Parse SDK data
      let sdkAnalytics = {};
      let sdkSource = {};
      let verifications = {};

      if (session.sdk_analytics) {
        try {
          sdkAnalytics = typeof session.sdk_analytics === 'string' ? JSON.parse(session.sdk_analytics) : session.sdk_analytics;
        } catch (e) {
          console.error('Error parsing sdk_analytics:', e);
        }
      }

      if (session.sdk_source) {
        try {
          sdkSource = typeof session.sdk_source === 'string' ? JSON.parse(session.sdk_source) : session.sdk_source;
        } catch (e) {
          console.error('Error parsing sdk_source:', e);
        }
      }

      if (session.sdk_verifications) {
        try {
          verifications = typeof session.sdk_verifications === 'string' ? JSON.parse(session.sdk_verifications) : session.sdk_verifications;
          if (Array.isArray(verifications) && verifications.length > 0) {
            verifications = verifications[0];
          }
        } catch (e) {
          console.error('Error parsing sdk_verifications:', e);
        }
      }

      if (session.fraud_scores) {
        try {
          const fraudScores = typeof session.fraud_scores === 'string' ? JSON.parse(session.fraud_scores) : session.fraud_scores;
          verifications = { ...verifications, ...fraudScores };
        } catch (e) {
          console.error('Error parsing fraud_scores:', e);
        }
      }

      // Parse events
      let events = [];
      if (sdkAnalytics) {
        events = Array.isArray(sdkAnalytics) ? sdkAnalytics : sdkAnalytics.events || [];
      }
      if (events.length === 0 && session.sdk_trace) {
        try {
          const trace = typeof session.sdk_trace === 'string' ? JSON.parse(session.sdk_trace) : session.sdk_trace;
          events = Array.isArray(trace) ? trace : [];
        } catch (e) {
          console.error('Error parsing sdk_trace:', e);
        }
      }

      // Build session data object
      currentSessionData = {
        sessionId: session.id,
        id: session.id,
        account_id: session.account_id,
        jti: session.jti,
        deviceIdentifier: sdkSource.deviceIdentifier || session.id,
        platform: sdkSource.devicePlatform || 'Unknown',
        devicePlatform: sdkSource.devicePlatform || 'Unknown',
        created_at: session.created_at,
        timestamp: session.created_at,
        outcome: session.verification_status || 'PENDING',
        status: session.verification_status || 'PENDING',
        verification_status: session.verification_status,
        document_type: session.document_type
      };

      // Build verification data structure
      currentVerificationData = {
        documentType: session.document_type || verifications.documentType,
        verifications: [verifications]
      };
      currentEventsData = events;

      // Fetch device history if we have a device identifier
      currentDeviceHistory = null;
      const deviceId = sdkSource.deviceIdentifier;
      if (deviceId) {
        try {
          const deviceResponse = await api.getDeviceHistoryFromSessions(deviceId, session.id);
          if (deviceResponse.success && deviceResponse.data) {
            currentDeviceHistory = deviceResponse.data;
          }
        } catch (e) {
          console.error('Error fetching device history:', e);
        }
      }

      // Store raw data for debugging
      currentRawData = {
        session: session,
        sdkAnalytics: sdkAnalytics,
        sdkSource: sdkSource,
        verifications: verifications,
        events: events,
        deviceHistory: currentDeviceHistory
      };

      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('session', sessionId);
      window.history.pushState({}, '', url);

      hideLoading();

      // Display session data
      displaySessionHeader();
      displayVerificationSummary();
      displayFraudFlags();
      displayDeviceHistory();
      displayUXAnalysis();
      displayRawData();

      // Hide list, show detail
      document.getElementById('sessions-list-view').style.display = 'none';
      document.getElementById('session-header').style.display = 'block';
      document.getElementById('tabs-container').style.display = 'block';
      return;
    }

    // Fall back to loading as account
    console.log('SDK session not found, trying as account...');
    await loadAccountAsSession(sessionId);

  } catch (error) {
    console.error('Error loading SDK session:', error);
    // Fall back to loading as account
    await loadAccountAsSession(sessionId);
  }
}

// Load account data as session
async function loadAccountAsSession(accountId) {
  try {
    showLoading();

    // Fetch account details
    const response = await api.getAccountById(accountId);

    if (!response.success) {
      hideLoading();
      showError('Session not found');
      return;
    }

    const account = response.data;

    // Parse SDK data
    let sdkAnalytics = {};
    let sdkSource = {};
    let verifications = {};

    if (account.sdk_analytics) {
      try {
        sdkAnalytics = typeof account.sdk_analytics === 'string' ? JSON.parse(account.sdk_analytics) : account.sdk_analytics;
      } catch (e) {
        console.error('Error parsing sdk_analytics:', e);
      }
    }

    if (account.sdk_source) {
      try {
        sdkSource = typeof account.sdk_source === 'string' ? JSON.parse(account.sdk_source) : account.sdk_source;
      } catch (e) {
        console.error('Error parsing sdk_source:', e);
      }
    }

    if (account.sdk_verifications) {
      try {
        verifications = typeof account.sdk_verifications === 'string' ? JSON.parse(account.sdk_verifications) : account.sdk_verifications;
        // If sdk_verifications is an array, get the first element
        if (Array.isArray(verifications) && verifications.length > 0) {
          verifications = verifications[0];
        }
      } catch (e) {
        console.error('Error parsing sdk_verifications:', e);
      }
    }

    // Also try fraud_scores column as fallback or merge
    if (account.fraud_scores) {
      try {
        const fraudScores = typeof account.fraud_scores === 'string' ? JSON.parse(account.fraud_scores) : account.fraud_scores;
        verifications = { ...verifications, ...fraudScores };
      } catch (e) {
        console.error('Error parsing fraud_scores:', e);
      }
    }

    // Parse events - try multiple sources
    let events = [];
    // Priority 1: sdk_analytics
    if (sdkAnalytics) {
      events = Array.isArray(sdkAnalytics) ? sdkAnalytics : sdkAnalytics.events || [];
    }
    // Priority 2: sdk_trace (raw trace from SDK)
    if (events.length === 0 && account.sdk_trace) {
      try {
        const trace = typeof account.sdk_trace === 'string' ? JSON.parse(account.sdk_trace) : account.sdk_trace;
        events = Array.isArray(trace) ? trace : [];
      } catch (e) {
        console.error('Error parsing sdk_trace:', e);
      }
    }

    // Build session data object
    currentSessionData = {
      sessionId: account.id,
      id: account.id,
      deviceIdentifier: sdkSource.deviceIdentifier || account.id,
      platform: sdkSource.devicePlatform || 'Unknown',
      devicePlatform: sdkSource.devicePlatform || 'Unknown',
      created_at: account.created_at,
      timestamp: account.created_at,
      outcome: account.verification_status || 'PENDING',
      status: account.verification_status || 'PENDING',
      verification_status: account.verification_status,
      document_type: account.document_type
    };

    // Build verification data structure that displayVerificationSummary expects
    // It expects { verifications: [{ ... }] } format
    currentVerificationData = {
      documentType: account.document_type || verifications.documentType,
      verifications: [verifications]
    };
    currentEventsData = events;

    // Fetch device history if we have a device identifier
    currentDeviceHistory = null;
    const deviceId = sdkSource.deviceIdentifier;
    if (deviceId) {
      try {
        const deviceResponse = await api.getDeviceHistoryFromSessions(deviceId, account.id);
        if (deviceResponse.success && deviceResponse.data) {
          currentDeviceHistory = deviceResponse.data;
        }
      } catch (e) {
        console.error('Error fetching device history:', e);
      }
    }

    // Store raw data for debugging
    currentRawData = {
      sdk_analytics: account.sdk_analytics,
      sdk_trace: account.sdk_trace,
      sdk_source: account.sdk_source,
      sdk_verifications: account.sdk_verifications,
      fraud_scores: account.fraud_scores,
      deviceHistory: currentDeviceHistory
    };

    hideLoading();

    // Display session data
    displaySessionHeader();
    displayVerificationSummary();
    displayFraudFlags();
    displayDeviceHistory();
    displayUXAnalysis();
    displayRawData(); // Display raw captured data

    // Hide list, show detail
    document.getElementById('sessions-list-view').style.display = 'none';
    document.getElementById('session-header').style.display = 'block';
    document.getElementById('tabs-container').style.display = 'block';

  } catch (error) {
    hideLoading();
    console.error('Error loading session:', error);
    showError('Error loading session data');
  }
}

// Refresh sessions list (optional - if button exists)
const refreshBtn = document.getElementById('refresh-sessions-btn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    loadSessionsList(currentPage);
  });
}

// Setup auto-refresh (every 30 seconds)
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    // Only refresh if in list view
    if (document.getElementById('sessions-list-view').style.display !== 'none') {
      loadSessionsList(currentPage);

      // Blink indicator
      const indicator = document.getElementById('auto-refresh-indicator');
      indicator.style.opacity = '0.3';
      setTimeout(() => {
        indicator.style.opacity = '1';
      }, 300);
    }
  }, 30000); // 30 seconds
}

// Display raw captured data for debugging
function displayRawData() {
  if (!currentRawData) {
    console.log('📭 No raw data available');
    return;
  }

  console.log('📦 Raw Data:', currentRawData);

  // Parse and format each field
  const formatJson = (data) => {
    if (!data) return 'null';
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(data);
    }
  };

  // sdk_analytics
  const analyticsEl = document.getElementById('raw-sdk-analytics');
  if (analyticsEl) {
    analyticsEl.textContent = formatJson(currentRawData.sdk_analytics);
  }

  // sdk_trace (original from SDK)
  const traceEl = document.getElementById('raw-sdk-trace');
  if (traceEl) {
    traceEl.textContent = formatJson(currentRawData.sdk_trace);
  }

  // sdk_source
  const sourceEl = document.getElementById('raw-sdk-source');
  if (sourceEl) {
    sourceEl.textContent = formatJson(currentRawData.sdk_source);
  }

  // sdk_verifications
  const verificationsEl = document.getElementById('raw-sdk-verifications');
  if (verificationsEl) {
    verificationsEl.textContent = formatJson(currentRawData.sdk_verifications);
  }

  // fraud_scores
  const fraudEl = document.getElementById('raw-fraud-scores');
  if (fraudEl) {
    fraudEl.textContent = formatJson(currentRawData.fraud_scores);
  }
}

// Toggle raw data visibility
function toggleRawData() {
  const container = document.getElementById('raw-data-container');
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
}

// Copy raw data to clipboard
function copyRawData() {
  if (!currentRawData) {
    showError('No raw data available');
    return;
  }

  const formatJson = (data) => {
    if (!data) return null;
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      return data;
    }
  };

  const formattedData = {
    sdk_analytics: formatJson(currentRawData.sdk_analytics),
    sdk_trace: formatJson(currentRawData.sdk_trace),
    sdk_source: formatJson(currentRawData.sdk_source),
    sdk_verifications: formatJson(currentRawData.sdk_verifications),
    fraud_scores: formatJson(currentRawData.fraud_scores)
  };

  navigator.clipboard.writeText(JSON.stringify(formattedData, null, 2))
    .then(() => {
      alert('Raw data copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      showError('Failed to copy raw data');
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Load analytics configuration first (for risk thresholds)
  await loadAnalyticsConfig();

  // Check for session ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  if (sessionId) {
    document.getElementById('session-search-input').value = sessionId;
    loadAccountAsSession(sessionId);
  } else {
    // Load sessions list by default
    loadSessionsList(1);
    startAutoRefresh();
  }
});
