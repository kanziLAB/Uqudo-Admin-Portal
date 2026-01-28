/**
 * User Journey Experience Matrix Component
 *
 * A UX behavioral analysis visualization that displays user journey stages
 * as a matrix with activities, satisfaction, experiences, and expectations rows.
 *
 * @author Uqudo Analytics Team
 * @version 1.0.0
 */

class UserJourneyExperienceMatrix {
  /**
   * @param {string} containerId - The ID of the container element
   * @param {Object} options - Configuration options
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = {
      onStageSelect: options.onStageSelect || null,
      showTooltips: options.showTooltips !== false,
      animateOnLoad: options.animateOnLoad !== false,
      ...options
    };

    // Journey Stages Configuration
    this.stages = [
      {
        id: 'entry',
        name: 'Entry Point',
        color: '#546e7a',
        cssClass: 'stage-entry'
      },
      {
        id: 'start',
        name: 'Start Verification',
        color: '#26a69a',
        cssClass: 'stage-start'
      },
      {
        id: 'document',
        name: 'Document Capture',
        color: '#1e88e5',
        cssClass: 'stage-document'
      },
      {
        id: 'face',
        name: 'Face Verification',
        color: '#5c6bc0',
        cssClass: 'stage-face'
      },
      {
        id: 'submission',
        name: 'Data Submission',
        color: '#7e57c2',
        cssClass: 'stage-submission'
      },
      {
        id: 'result',
        name: 'Result / Support',
        color: '#00acc1',
        cssClass: 'stage-result'
      }
    ];

    // Row Types
    this.rows = ['Activities', 'Satisfaction', 'Experiences', 'Expectations'];

    // Default mock data
    this.data = this.getDefaultData();
  }

  /**
   * Get default mock data for the matrix
   */
  getDefaultData() {
    return {
      entry: {
        activity: {
          icon: 'link',
          text: 'Opens verification link'
        },
        satisfaction: 5,
        experiences: [
          { text: 'Clear entry page', type: 'positive' },
          { text: 'Quick page load', type: 'positive' }
        ],
        expectation: 'Fast start',
        metrics: {
          avgTime: '2.3s',
          dropOff: '5%',
          retryRate: '0%'
        }
      },
      start: {
        activity: {
          icon: 'play_circle',
          text: 'Reads instructions'
        },
        satisfaction: 4,
        experiences: [
          { text: 'Clear instructions', type: 'positive' },
          { text: 'Permission requests', type: 'neutral' }
        ],
        expectation: 'Simple process',
        metrics: {
          avgTime: '8.5s',
          dropOff: '12%',
          retryRate: '3%'
        }
      },
      document: {
        activity: {
          icon: 'badge',
          text: 'Captures ID document'
        },
        satisfaction: 3,
        experiences: [
          { text: 'Camera permission issues', type: 'negative' },
          { text: 'Lighting challenges', type: 'negative' },
          { text: 'Auto-capture guide', type: 'positive' }
        ],
        expectation: 'Simple capture',
        metrics: {
          avgTime: '25.4s',
          dropOff: '18%',
          retryRate: '35%'
        }
      },
      face: {
        activity: {
          icon: 'face',
          text: 'Completes liveness check'
        },
        satisfaction: 3,
        experiences: [
          { text: 'Position challenges', type: 'negative' },
          { text: 'Lighting issues', type: 'negative' },
          { text: 'Real-time feedback', type: 'positive' }
        ],
        expectation: 'Privacy assurance',
        metrics: {
          avgTime: '18.2s',
          dropOff: '15%',
          retryRate: '28%'
        }
      },
      submission: {
        activity: {
          icon: 'upload',
          text: 'Submits data'
        },
        satisfaction: 4,
        experiences: [
          { text: 'Processing indicator', type: 'positive' },
          { text: 'Waiting for processing', type: 'neutral' }
        ],
        expectation: 'Quick processing',
        metrics: {
          avgTime: '3.8s',
          dropOff: '2%',
          retryRate: '5%'
        }
      },
      result: {
        activity: {
          icon: 'verified',
          text: 'Views verification outcome'
        },
        satisfaction: 5,
        experiences: [
          { text: 'Clear result status', type: 'positive' },
          { text: 'Support access available', type: 'positive' }
        ],
        expectation: 'Instant result',
        metrics: {
          avgTime: '1.5s',
          dropOff: '0%',
          retryRate: '0%'
        }
      }
    };
  }

  /**
   * Get satisfaction emoji based on score (1-5)
   */
  getSatisfactionEmoji(score) {
    const emojis = {
      1: '\u{1F61E}', // Disappointed
      2: '\u{1F615}', // Confused
      3: '\u{1F610}', // Neutral
      4: '\u{1F60A}', // Happy
      5: '\u{1F60D}'  // Heart eyes / Excited
    };
    return emojis[score] || emojis[3];
  }

  /**
   * Calculate Y position for satisfaction curve
   */
  getSatisfactionY(score) {
    // Map score 1-5 to Y position (higher score = lower Y = higher on chart)
    const minY = 10;
    const maxY = 50;
    return maxY - ((score - 1) / 4) * (maxY - minY);
  }

  /**
   * Generate the satisfaction curve SVG path
   */
  generateSatisfactionCurvePath() {
    const points = this.stages.map((stage, index) => {
      const stageData = this.data[stage.id];
      const score = stageData?.satisfaction || 3;
      const x = (index / (this.stages.length - 1)) * 100;
      const y = this.getSatisfactionY(score);
      return { x, y };
    });

    // Create smooth curve using quadratic bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` Q ${cpX} ${prev.y}, ${cpX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return path;
  }

  /**
   * Build the tooltip HTML for a cell
   */
  buildTooltip(stageData) {
    if (!this.options.showTooltips || !stageData?.metrics) return '';

    const { avgTime, dropOff, retryRate } = stageData.metrics;
    return `
      <div class="journey-tooltip">
        <div class="tooltip-row">
          <span class="tooltip-label">Avg Time:</span>
          <span class="tooltip-value">${avgTime}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Drop-off:</span>
          <span class="tooltip-value">${dropOff}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Retry Rate:</span>
          <span class="tooltip-value">${retryRate}</span>
        </div>
      </div>
    `;
  }

  /**
   * Build activity cell HTML
   */
  buildActivityCell(stageData, stageId, cellIndex) {
    if (!stageData?.activity) {
      return `<div class="journey-cell activity-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <span class="text-muted">-</span>
      </div>`;
    }

    const { icon, text } = stageData.activity;
    return `
      <div class="journey-cell activity-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <div class="activity-icon">
          <i class="material-symbols-rounded">${icon}</i>
        </div>
        <div class="activity-text">${text}</div>
        ${this.buildTooltip(stageData)}
      </div>
    `;
  }

  /**
   * Build satisfaction cell HTML
   */
  buildSatisfactionCell(stageData, stageId, cellIndex) {
    const score = stageData?.satisfaction || 3;
    const emoji = this.getSatisfactionEmoji(score);

    return `
      <div class="journey-cell satisfaction-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <span class="satisfaction-emoji">${emoji}</span>
        ${this.buildTooltip(stageData)}
      </div>
    `;
  }

  /**
   * Build experience cell HTML
   */
  buildExperienceCell(stageData, stageId, cellIndex) {
    if (!stageData?.experiences || stageData.experiences.length === 0) {
      return `<div class="journey-cell experience-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <span class="text-muted">-</span>
      </div>`;
    }

    const experienceItems = stageData.experiences
      .map(exp => `<div class="experience-item ${exp.type || ''}">${exp.text}</div>`)
      .join('');

    return `
      <div class="journey-cell experience-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        ${experienceItems}
        ${this.buildTooltip(stageData)}
      </div>
    `;
  }

  /**
   * Build expectation cell HTML
   */
  buildExpectationCell(stageData, stageId, cellIndex) {
    const expectation = stageData?.expectation || '-';

    return `
      <div class="journey-cell expectation-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        ${expectation}
        ${this.buildTooltip(stageData)}
      </div>
    `;
  }

  /**
   * Build the satisfaction curve SVG overlay
   */
  buildSatisfactionCurve() {
    const curvePath = this.generateSatisfactionCurvePath();

    return `
      <svg class="satisfaction-curve" viewBox="0 0 100 60" preserveAspectRatio="none">
        <path d="${curvePath}" />
      </svg>
    `;
  }

  /**
   * Render the matrix in desktop view
   */
  renderDesktop() {
    let cellIndex = 0;

    // Build stage headers
    const stageHeaders = this.stages.map(stage => `
      <div class="journey-stage-header ${stage.cssClass}"
           data-stage-id="${stage.id}"
           title="Click to select ${stage.name}">
        <span class="stage-text">${stage.name}</span>
      </div>
    `).join('');

    // Build rows
    let gridContent = `<div class="journey-corner-cell"></div>${stageHeaders}`;

    // Activities Row
    gridContent += `<div class="journey-row-label">Activities</div>`;
    this.stages.forEach(stage => {
      gridContent += this.buildActivityCell(this.data[stage.id], stage.id, cellIndex++);
    });

    // Satisfaction Row
    gridContent += `<div class="journey-row-label">Satisfaction</div>`;
    this.stages.forEach(stage => {
      gridContent += this.buildSatisfactionCell(this.data[stage.id], stage.id, cellIndex++);
    });

    // Experiences Row
    gridContent += `<div class="journey-row-label">Experiences</div>`;
    this.stages.forEach(stage => {
      gridContent += this.buildExperienceCell(this.data[stage.id], stage.id, cellIndex++);
    });

    // Expectations Row
    gridContent += `<div class="journey-row-label">Expectations</div>`;
    this.stages.forEach(stage => {
      gridContent += this.buildExpectationCell(this.data[stage.id], stage.id, cellIndex++);
    });

    return `
      <div class="journey-matrix-container">
        <div class="journey-matrix-grid">
          ${gridContent}
        </div>
        <div class="satisfaction-curve-overlay" style="position: absolute; top: 0; left: 140px; right: 0; height: 100%; pointer-events: none;">
          <!-- Satisfaction curve renders across satisfaction row -->
        </div>
      </div>
    `;
  }

  /**
   * Render the matrix in mobile view (stacked cards)
   */
  renderMobile() {
    return this.stages.map(stage => {
      const stageData = this.data[stage.id];
      const satisfaction = stageData?.satisfaction || 3;
      const emoji = this.getSatisfactionEmoji(satisfaction);

      return `
        <div class="mobile-stage-card">
          <div class="mobile-stage-header" style="background: ${stage.color}">
            ${stage.name}
          </div>
          <div class="mobile-stage-content">
            <div class="mobile-row">
              <div class="mobile-row-label">Activity</div>
              <div class="mobile-row-value">
                ${stageData?.activity?.text || '-'}
              </div>
            </div>
            <div class="mobile-row">
              <div class="mobile-row-label">Satisfaction</div>
              <div class="mobile-row-value">
                <span style="font-size: 1.5rem;">${emoji}</span>
              </div>
            </div>
            <div class="mobile-row">
              <div class="mobile-row-label">Experiences</div>
              <div class="mobile-row-value">
                ${stageData?.experiences?.map(exp => `<div>${exp.text}</div>`).join('') || '-'}
              </div>
            </div>
            <div class="mobile-row">
              <div class="mobile-row-label">Expectation</div>
              <div class="mobile-row-value">
                ${stageData?.expectation || '-'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Main render method
   */
  render() {
    if (!this.container) {
      console.error(`UserJourneyExperienceMatrix: Container #${this.containerId} not found`);
      return;
    }

    const isMobile = window.innerWidth < 768;

    const html = `
      <div class="user-journey-matrix">
        <div class="user-journey-matrix-header">
          <div class="user-journey-matrix-title">
            <i class="material-symbols-rounded">route</i>
            User Journey Experience Matrix
          </div>
          <div class="user-journey-matrix-hint">
            <i class="material-symbols-rounded" style="font-size: 1rem; vertical-align: middle;">info</i>
            Hover for metrics
          </div>
        </div>
        ${isMobile ? `<div class="journey-matrix-grid mobile-stacked">${this.renderMobile()}</div>` : this.renderDesktop()}
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Attach event listeners for interactivity
   */
  attachEventListeners() {
    // Stage header click handlers
    const stageHeaders = this.container.querySelectorAll('.journey-stage-header');
    stageHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const stageId = header.dataset.stageId;
        this.handleStageSelect(stageId);
      });
    });

    // Handle window resize for responsive rendering
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.render();
      }, 250);
    });
  }

  /**
   * Handle stage selection
   */
  handleStageSelect(stageId) {
    // Highlight the selected stage column
    const grid = this.container.querySelector('.journey-matrix-grid');
    if (grid) {
      // Remove previous highlight
      grid.removeAttribute('data-highlighted-stage');

      // Toggle highlight
      if (this.selectedStage !== stageId) {
        this.selectedStage = stageId;
        grid.setAttribute('data-highlighted-stage', stageId);

        // Mark cells belonging to this stage
        const cells = grid.querySelectorAll('.journey-cell');
        cells.forEach(cell => {
          if (cell.dataset.stage === stageId) {
            cell.setAttribute('data-stage', stageId);
          } else {
            cell.removeAttribute('data-stage');
          }
        });
      } else {
        this.selectedStage = null;
      }
    }

    // Call the callback if provided
    if (this.options.onStageSelect) {
      this.options.onStageSelect(stageId);
    }
  }

  /**
   * Update the matrix with new data
   * @param {Object} newData - New journey data
   */
  updateData(newData) {
    this.data = { ...this.getDefaultData(), ...newData };
    this.render();
  }

  /**
   * Update data from SDK analytics events
   * @param {Array} events - SDK analytics events
   * @param {Object} flowMetrics - Flow metrics from calculateFlowMetrics
   */
  updateFromSDKData(events, flowMetrics = {}) {
    if (!events || events.length === 0) {
      this.render();
      return;
    }

    // Map SDK events to journey stages
    const eventTypeMap = {
      'SCAN': 'document',
      'READ': 'document',
      'NFC': 'document',
      'FACE': 'face',
      'SUBMIT': 'submission',
      'COMPLETE': 'result',
      'SUCCESS': 'result',
      'FAILURE': 'result'
    };

    // Analyze events for metrics
    const stageMetrics = {};
    let hasEntryEvent = false;
    let hasStartEvent = false;

    events.forEach(event => {
      const eventType = (event.type || event.event || '').toUpperCase();
      const stageId = eventTypeMap[eventType];

      if (eventType === 'START' || eventType === 'INIT') {
        hasStartEvent = true;
      }

      if (stageId) {
        if (!stageMetrics[stageId]) {
          stageMetrics[stageId] = {
            count: 0,
            totalDuration: 0,
            retries: 0,
            failures: 0
          };
        }

        stageMetrics[stageId].count++;

        // Track duration
        const duration = event.duration || event.time || 0;
        stageMetrics[stageId].totalDuration += duration;

        // Track retries/failures
        const status = (event.status || '').toLowerCase();
        if (status === 'failure' || status === 'failed' || status === 'retry') {
          stageMetrics[stageId].failures++;
          stageMetrics[stageId].retries++;
        }
      }
    });

    // Update satisfaction scores based on metrics
    const updatedData = { ...this.data };

    Object.keys(stageMetrics).forEach(stageId => {
      const metrics = stageMetrics[stageId];
      const avgDuration = metrics.totalDuration / (metrics.count || 1);
      const retryRate = (metrics.retries / metrics.count) * 100;

      // Calculate satisfaction based on retry rate and duration
      let satisfaction = 5;
      if (retryRate > 30) satisfaction = 2;
      else if (retryRate > 15) satisfaction = 3;
      else if (retryRate > 5) satisfaction = 4;

      // Adjust for long durations
      if (avgDuration > 30000) satisfaction = Math.min(satisfaction, 3);
      else if (avgDuration > 15000) satisfaction = Math.min(satisfaction, 4);

      if (updatedData[stageId]) {
        updatedData[stageId].satisfaction = satisfaction;
        updatedData[stageId].metrics = {
          avgTime: this.formatDuration(avgDuration),
          dropOff: `${Math.round((metrics.failures / metrics.count) * 100)}%`,
          retryRate: `${Math.round(retryRate)}%`
        };
      }
    });

    // Update flow metrics if provided
    if (flowMetrics.documentScanTime !== undefined) {
      updatedData.document.metrics.avgTime = this.formatDuration(flowMetrics.documentScanTime);
    }
    if (flowMetrics.faceScanTime !== undefined) {
      updatedData.face.metrics.avgTime = this.formatDuration(flowMetrics.faceScanTime);
    }
    if (flowMetrics.totalDuration !== undefined) {
      updatedData.entry.metrics.avgTime = this.formatDuration(flowMetrics.timeToFirstInteraction || 0);
    }

    this.data = updatedData;
    this.render();
  }

  /**
   * Format duration in milliseconds to human readable
   */
  formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  /**
   * Static method to create and render the matrix
   */
  static init(containerId, options = {}) {
    const matrix = new UserJourneyExperienceMatrix(containerId, options);
    matrix.render();
    return matrix;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserJourneyExperienceMatrix;
}

// Make available globally
window.UserJourneyExperienceMatrix = UserJourneyExperienceMatrix;
