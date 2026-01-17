/**
 * Performance Journey Component
 * Visualizes SDK analytics events in a timeline format
 */

class PerformanceJourney {
  constructor(containerId, events = []) {
    this.container = document.getElementById(containerId);
    this.events = events;
    this.expandedEvents = new Set();
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(ms) {
    if (ms === 0 || ms === null || ms === undefined) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  /**
   * Format time from timestamp
   */
  formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  /**
   * Get status class based on result
   */
  getStatusClass(status) {
    if (!status) return 'pending';
    const statusLower = status.toLowerCase();
    if (statusLower === 'success' || statusLower === 'passed' || statusLower === 'approved') {
      return 'success';
    }
    if (statusLower === 'failure' || statusLower === 'failed' || statusLower === 'rejected') {
      return 'failure';
    }
    return 'pending';
  }

  /**
   * Get icon for event type
   */
  getEventIcon(eventType) {
    const icons = {
      'view': 'visibility',
      'scan': 'document_scanner',
      'start': 'play_circle',
      'finish': 'check_circle',
      'face_match': 'face',
      'liveness': 'sensors',
      'nfc_reading': 'nfc',
      'ocr': 'text_fields',
      'document_quality': 'high_quality',
      'background_check': 'shield',
      'verification': 'verified_user',
      'submit': 'send',
      'error': 'error'
    };

    const type = eventType ? eventType.toLowerCase().replace(/[_\s-]+/g, '_') : '';

    for (const [key, icon] of Object.entries(icons)) {
      if (type.includes(key)) return icon;
    }

    return 'info';
  }

  /**
   * Calculate total duration
   */
  calculateTotalDuration() {
    if (this.events.length === 0) return 0;

    const firstEvent = this.events[0];
    const lastEvent = this.events[this.events.length - 1];

    if (firstEvent.timestamp && lastEvent.timestamp) {
      return new Date(lastEvent.timestamp) - new Date(firstEvent.timestamp);
    }

    return this.events.reduce((sum, event) => sum + (event.duration || 0), 0);
  }

  /**
   * Get key events for timeline (first, middle, last)
   */
  getKeyEvents() {
    if (this.events.length === 0) return [];
    if (this.events.length <= 3) return this.events;

    const keyEvents = [
      this.events[0], // First event
      this.events[Math.floor(this.events.length / 2)], // Middle event
      this.events[this.events.length - 1] // Last event
    ];

    return keyEvents;
  }

  /**
   * Render timeline visualization
   */
  renderTimeline() {
    const keyEvents = this.getKeyEvents();
    if (keyEvents.length === 0) return '';

    const totalDuration = this.calculateTotalDuration();
    let cumulativeDuration = 0;

    const steps = keyEvents.map((event, index) => {
      const statusClass = this.getStatusClass(event.status);
      const icon = this.getEventIcon(event.name);
      const duration = this.formatDuration(event.duration || cumulativeDuration);

      cumulativeDuration += (event.duration || 0);

      return `
        <div class="journey-step">
          <div class="journey-step-indicator ${statusClass}">
            <div class="step-icon-wrapper">
              <i class="material-symbols-rounded step-icon">${
                statusClass === 'success' ? 'check' :
                statusClass === 'failure' ? 'close' :
                'schedule'
              }</i>
            </div>
          </div>
          <div class="journey-step-label">${event.name || `Step ${index + 1}`}</div>
          <div class="journey-step-duration">${duration}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="journey-timeline">
        <div class="journey-timeline-line"></div>
        ${steps}
        <div class="journey-total">
          Total:<span class="journey-total-value">${this.formatDuration(totalDuration)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Toggle event details
   */
  toggleEventDetails(eventId) {
    const eventElement = document.getElementById(`event-${eventId}`);
    if (!eventElement) return;

    if (this.expandedEvents.has(eventId)) {
      this.expandedEvents.delete(eventId);
      eventElement.classList.remove('expanded');
    } else {
      this.expandedEvents.add(eventId);
      eventElement.classList.add('expanded');
    }
  }

  /**
   * Render event details
   */
  renderEventDetails(event) {
    if (!event.details) return '';

    const details = [];

    if (event.details.score !== undefined) {
      details.push({ label: 'Score', value: `${Math.round(event.details.score * 100)}%` });
    }
    if (event.details.confidence !== undefined) {
      details.push({ label: 'Confidence', value: `${Math.round(event.details.confidence * 100)}%` });
    }
    if (event.details.quality !== undefined) {
      details.push({ label: 'Quality', value: `${Math.round(event.details.quality * 100)}%` });
    }
    if (event.details.method) {
      details.push({ label: 'Method', value: event.details.method });
    }
    if (event.details.device) {
      details.push({ label: 'Device', value: event.details.device });
    }
    if (event.details.error) {
      details.push({ label: 'Error', value: event.details.error });
    }

    if (details.length === 0) return '';

    const detailsHTML = details.map(detail => `
      <div class="journey-event-detail-item">
        <span class="journey-event-detail-label">${detail.label}:</span>
        <span class="journey-event-detail-value">${detail.value}</span>
      </div>
    `).join('');

    return `
      <div class="journey-event-details">
        <div class="journey-event-details-content">
          <div class="journey-event-details-grid">
            ${detailsHTML}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render events list
   */
  renderEventsList() {
    if (this.events.length === 0) {
      return `
        <div class="journey-empty-state">
          <i class="material-symbols-rounded">analytics</i>
          <p>No performance data available</p>
        </div>
      `;
    }

    return `
      <div class="journey-events-list">
        ${this.events.map((event, index) => {
          const statusClass = this.getStatusClass(event.status);
          const icon = this.getEventIcon(event.name);
          const duration = this.formatDuration(event.duration);
          const time = this.formatTime(event.timestamp);
          const eventId = `${event.name || 'event'}-${index}`;
          const isExpanded = this.expandedEvents.has(eventId);

          return `
            <div class="journey-event-item ${isExpanded ? 'expanded' : ''}" id="event-${eventId}" onclick="performanceJourney.toggleEventDetails('${eventId}')">
              <div class="journey-event-left">
                <div class="journey-event-status-dot ${statusClass}"></div>
                <div class="journey-event-info">
                  <div class="journey-event-name">
                    ${event.name || 'Unknown Event'}
                  </div>
                  <div class="journey-event-meta">
                    <div class="journey-event-meta-item">
                      <i class="material-symbols-rounded">schedule</i>
                      <span>${time}</span>
                    </div>
                    <div class="journey-event-meta-item">
                      <i class="material-symbols-rounded">category</i>
                      <span>${event.type || 'ENROLLMENT'}</span>
                    </div>
                    <div class="journey-event-meta-item">
                      <i class="material-symbols-rounded">tag</i>
                      <span>${event.id || 'GENERIC_ID'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="journey-event-right">
                <div class="journey-event-duration">${duration > '0ms' ? '+' : ''}${duration}</div>
                <div class="journey-event-badge ${statusClass}">
                  ${statusClass.toUpperCase()}
                </div>
                <i class="material-symbols-rounded journey-event-expand">expand_more</i>
              </div>
              ${this.renderEventDetails(event)}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render complete performance journey
   */
  render() {
    if (!this.container) {
      console.error('Performance Journey: Container not found');
      return;
    }

    const html = `
      <div class="performance-journey-card">
        <div class="performance-journey-header">
          <div class="performance-journey-title">
            <i class="material-symbols-rounded">trending_up</i>
            <span>Performance Journey</span>
          </div>
          <div class="performance-journey-hint">Hover for details</div>
        </div>
        ${this.renderTimeline()}
        ${this.renderEventsList()}
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Update events and re-render
   */
  updateEvents(events) {
    this.events = events;
    this.expandedEvents.clear();
    this.render();
  }
}

/**
 * Parse SDK analytics from account/alert data
 */
function parseSDKAnalytics(data) {
  const events = [];

  // Priority 1: Use sdk_analytics (real data from SDK)
  if (data.sdk_analytics && Array.isArray(data.sdk_analytics)) {
    console.log('✅ Using real SDK analytics data:', data.sdk_analytics.length, 'events');
    return data.sdk_analytics;
  }

  // Priority 2: If data has analytics property (legacy)
  if (data.analytics && Array.isArray(data.analytics)) {
    return data.analytics;
  }

  // If data has verification steps
  if (data.verification_steps && Array.isArray(data.verification_steps)) {
    return data.verification_steps.map(step => ({
      name: step.step_name || step.name,
      type: step.step_type || 'VERIFICATION',
      status: step.status || step.result,
      duration: step.duration_ms || step.duration,
      timestamp: step.timestamp || step.created_at,
      id: step.step_id || 'GENERIC_ID',
      details: step.details || {}
    }));
  }

  // Parse from source data if available
  if (data.source) {
    const source = data.source;

    // View/Start event
    if (source.start_time) {
      events.push({
        name: 'VIEW',
        type: 'SCAN',
        status: 'success',
        timestamp: source.start_time,
        duration: 0,
        id: 'GENERIC_ID'
      });
    }

    // Scan start
    if (source.scan_start_time) {
      const prevTime = events.length > 0 ? new Date(events[events.length - 1].timestamp) : null;
      const scanStart = new Date(source.scan_start_time);

      events.push({
        name: 'START',
        type: 'SCAN',
        status: 'success',
        timestamp: source.scan_start_time,
        duration: prevTime ? scanStart - prevTime : 0,
        id: 'GENERIC_ID'
      });
    }

    // Scan finish
    if (source.scan_end_time) {
      const prevTime = events.length > 0 ? new Date(events[events.length - 1].timestamp) : null;
      const scanEnd = new Date(source.scan_end_time);

      events.push({
        name: 'FINISH',
        type: 'SCAN',
        status: data.verification_status === 'approved' ? 'success' : 'failure',
        timestamp: source.scan_end_time,
        duration: prevTime ? scanEnd - prevTime : 0,
        id: 'GENERIC_ID'
      });
    }
  }

  // If no events found, create synthetic events from data
  if (events.length === 0 && data.created_at) {
    const baseTime = new Date(data.created_at);

    events.push({
      name: 'VIEW',
      type: 'SCAN',
      status: 'success',
      timestamp: baseTime.toISOString(),
      duration: 0,
      id: 'GENERIC_ID'
    });

    events.push({
      name: 'START',
      type: 'SCAN',
      status: 'success',
      timestamp: new Date(baseTime.getTime() + 5000).toISOString(),
      duration: 5000,
      id: 'GENERIC_ID'
    });

    events.push({
      name: 'FINISH',
      type: 'SCAN',
      status: data.aml_status === 'aml_clear' ? 'success' : 'failure',
      timestamp: new Date(baseTime.getTime() + 8500).toISOString(),
      duration: 3500,
      id: 'GENERIC_ID'
    });
  }

  return events;
}

// Make available globally
window.PerformanceJourney = PerformanceJourney;
window.parseSDKAnalytics = parseSDKAnalytics;
