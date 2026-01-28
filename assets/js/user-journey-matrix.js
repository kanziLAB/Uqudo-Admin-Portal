/**
 * User Journey Experience Matrix Component
 *
 * A UX behavioral analysis visualization that displays user journey stages
 * as a matrix with activities, satisfaction, experiences, and expectations rows.
 * ALL data is derived from real SDK events - no mock data.
 *
 * @author Uqudo Analytics Team
 * @version 2.0.0
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
        cssClass: 'stage-entry',
        icon: 'link',
        eventTypes: ['INIT', 'START', 'OPEN', 'LAUNCH']
      },
      {
        id: 'start',
        name: 'Start Verification',
        color: '#26a69a',
        cssClass: 'stage-start',
        icon: 'play_circle',
        eventTypes: ['CONSENT', 'PERMISSION', 'BEGIN', 'READY']
      },
      {
        id: 'document',
        name: 'Document Capture',
        color: '#1e88e5',
        cssClass: 'stage-document',
        icon: 'badge',
        eventTypes: ['SCAN', 'READ', 'NFC', 'DOCUMENT', 'OCR', 'CAPTURE']
      },
      {
        id: 'face',
        name: 'Face Verification',
        color: '#5c6bc0',
        cssClass: 'stage-face',
        icon: 'face',
        eventTypes: ['FACE', 'LIVENESS', 'SELFIE', 'BIOMETRIC']
      },
      {
        id: 'submission',
        name: 'Data Submission',
        color: '#7e57c2',
        cssClass: 'stage-submission',
        icon: 'upload',
        eventTypes: ['SUBMIT', 'UPLOAD', 'SEND', 'PROCESS']
      },
      {
        id: 'result',
        name: 'Result / Support',
        color: '#00acc1',
        cssClass: 'stage-result',
        icon: 'verified',
        eventTypes: ['COMPLETE', 'SUCCESS', 'FAILURE', 'RESULT', 'DONE', 'FINISH']
      }
    ];

    // Row Types
    this.rows = ['Activities', 'Satisfaction', 'Experiences', 'Expectations'];

    // Initialize with empty data
    this.data = this.getEmptyData();
    this.hasData = false;
  }

  /**
   * Get empty data structure (no mock data)
   */
  getEmptyData() {
    const emptyData = {};
    this.stages.forEach(stage => {
      emptyData[stage.id] = {
        activity: null,
        satisfaction: null,
        experiences: [],
        expectation: null,
        metrics: null,
        events: [],
        hasData: false
      };
    });
    return emptyData;
  }

  /**
   * Map event type to stage ID
   */
  mapEventToStage(eventType) {
    const type = (eventType || '').toUpperCase();
    for (const stage of this.stages) {
      if (stage.eventTypes.some(et => type.includes(et))) {
        return stage.id;
      }
    }
    return null;
  }

  /**
   * Get stage configuration by ID
   */
  getStageConfig(stageId) {
    return this.stages.find(s => s.id === stageId);
  }

  /**
   * Derive activity text from event data
   */
  deriveActivityFromEvents(events, stageId) {
    if (!events || events.length === 0) return null;

    const stageConfig = this.getStageConfig(stageId);
    const eventNames = events.map(e => e.name || e.event || e.type || '').filter(Boolean);
    const uniqueNames = [...new Set(eventNames)];

    // Build activity description from actual events
    const activityMap = {
      'entry': () => {
        if (uniqueNames.some(n => n.toLowerCase().includes('init'))) return 'Session initialized';
        if (uniqueNames.some(n => n.toLowerCase().includes('start'))) return 'Verification started';
        return 'Entered verification flow';
      },
      'start': () => {
        if (uniqueNames.some(n => n.toLowerCase().includes('consent'))) return 'Provided consent';
        if (uniqueNames.some(n => n.toLowerCase().includes('permission'))) return 'Granted permissions';
        return 'Started verification process';
      },
      'document': () => {
        const hasNfc = uniqueNames.some(n => n.toLowerCase().includes('nfc'));
        const hasScan = uniqueNames.some(n => n.toLowerCase().includes('scan'));
        const hasRead = uniqueNames.some(n => n.toLowerCase().includes('read'));
        if (hasNfc && hasScan) return 'Scanned document & read NFC chip';
        if (hasNfc) return 'Read document NFC chip';
        if (hasScan || hasRead) return 'Captured ID document';
        return 'Document verification';
      },
      'face': () => {
        const hasLiveness = uniqueNames.some(n => n.toLowerCase().includes('liveness'));
        const hasSelfie = uniqueNames.some(n => n.toLowerCase().includes('selfie'));
        if (hasLiveness) return 'Completed liveness check';
        if (hasSelfie) return 'Captured selfie';
        return 'Face verification completed';
      },
      'submission': () => {
        if (uniqueNames.some(n => n.toLowerCase().includes('upload'))) return 'Uploaded verification data';
        if (uniqueNames.some(n => n.toLowerCase().includes('submit'))) return 'Submitted for verification';
        return 'Data submitted';
      },
      'result': () => {
        const hasSuccess = events.some(e => (e.status || '').toLowerCase() === 'success');
        const hasFailure = events.some(e => (e.status || '').toLowerCase().includes('fail'));
        if (hasSuccess) return 'Verification approved';
        if (hasFailure) return 'Verification requires review';
        return 'Received verification result';
      }
    };

    const getText = activityMap[stageId];
    return {
      icon: stageConfig?.icon || 'check_circle',
      text: getText ? getText() : `${events.length} event(s) processed`
    };
  }

  /**
   * Derive experiences from event data (real issues/successes)
   */
  deriveExperiencesFromEvents(events, stageId) {
    if (!events || events.length === 0) return [];

    const experiences = [];
    const seenExperiences = new Set();

    events.forEach(event => {
      const status = (event.status || '').toLowerCase();
      const name = (event.name || event.event || '').toLowerCase();
      const details = event.details || event.data || {};

      // Check for failures/retries
      if (status === 'failure' || status === 'failed') {
        const exp = { text: `${event.name || 'Step'} failed`, type: 'negative' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }

      // Check for environment issues
      if (details.darkEnvironment || name.includes('dark')) {
        const exp = { text: 'Dark environment detected', type: 'negative' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }

      if (details.blurDetected || name.includes('blur')) {
        const exp = { text: 'Blur detected', type: 'negative' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }

      if (details.glareDetected || name.includes('glare')) {
        const exp = { text: 'Glare detected', type: 'negative' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }

      if (details.positionIssue || name.includes('position')) {
        const exp = { text: 'Position adjustment needed', type: 'negative' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }

      if (details.distanceIssue || name.includes('distance')) {
        const exp = { text: 'Distance adjustment needed', type: 'negative' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }

      // Check for successes
      if (status === 'success' || status === 'completed') {
        const exp = { text: `${event.name || 'Step'} completed`, type: 'positive' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }

      // Check for retries (indicates friction)
      if (event.retryCount && event.retryCount > 0) {
        const exp = { text: `${event.retryCount} retry attempt(s)`, type: 'negative' };
        if (!seenExperiences.has(exp.text)) {
          experiences.push(exp);
          seenExperiences.add(exp.text);
        }
      }
    });

    // If no specific experiences found, derive from event count and duration
    if (experiences.length === 0 && events.length > 0) {
      const totalDuration = events.reduce((sum, e) => sum + (e.duration || 0), 0);
      const avgDuration = totalDuration / events.length;

      if (avgDuration > 15000) {
        experiences.push({ text: 'Extended processing time', type: 'neutral' });
      } else if (avgDuration < 3000) {
        experiences.push({ text: 'Quick processing', type: 'positive' });
      }

      if (events.every(e => (e.status || '').toLowerCase() === 'success')) {
        experiences.push({ text: 'All steps successful', type: 'positive' });
      }
    }

    return experiences.slice(0, 4); // Max 4 experiences per stage
  }

  /**
   * Derive expectation text from stage and performance
   */
  deriveExpectationFromEvents(events, stageId, metrics) {
    if (!events || events.length === 0) return null;

    const avgTime = metrics?.avgDuration || 0;
    const retryRate = metrics?.retryRate || 0;
    const dropOff = metrics?.dropOffRate || 0;

    const expectationMap = {
      'entry': () => {
        if (avgTime < 2000) return 'Fast entry achieved';
        if (avgTime > 5000) return 'Entry could be faster';
        return 'Entry time acceptable';
      },
      'start': () => {
        if (retryRate > 10) return 'Simplify permissions flow';
        return 'Smooth start';
      },
      'document': () => {
        if (retryRate > 30) return 'Capture UX needs improvement';
        if (retryRate > 15) return 'Some capture friction';
        return 'Capture working well';
      },
      'face': () => {
        if (retryRate > 25) return 'Liveness UX needs work';
        if (avgTime > 20000) return 'Face check could be faster';
        return 'Biometric flow smooth';
      },
      'submission': () => {
        if (avgTime > 5000) return 'Processing time high';
        return 'Quick submission';
      },
      'result': () => {
        if (dropOff > 5) return 'Result clarity needed';
        return 'Clear outcome delivered';
      }
    };

    const getExpectation = expectationMap[stageId];
    return getExpectation ? getExpectation() : 'Step completed';
  }

  /**
   * Calculate satisfaction score from real metrics (1-5 scale)
   */
  calculateSatisfactionFromMetrics(metrics) {
    if (!metrics) return null;

    const { retryRate = 0, dropOffRate = 0, avgDuration = 0 } = metrics;

    // Start with 5 and deduct based on issues
    let score = 5;

    // Retry rate impact
    if (retryRate > 40) score -= 2;
    else if (retryRate > 25) score -= 1.5;
    else if (retryRate > 10) score -= 1;
    else if (retryRate > 5) score -= 0.5;

    // Drop-off impact
    if (dropOffRate > 20) score -= 1;
    else if (dropOffRate > 10) score -= 0.5;

    // Duration impact (anything over 30s is problematic)
    if (avgDuration > 45000) score -= 1;
    else if (avgDuration > 30000) score -= 0.5;

    return Math.max(1, Math.min(5, Math.round(score)));
  }

  /**
   * Get satisfaction emoji based on score (1-5)
   */
  getSatisfactionEmoji(score) {
    if (score === null) return '\u{2014}'; // Em dash for no data
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
   * Build the tooltip HTML for a cell
   */
  buildTooltip(stageData) {
    if (!this.options.showTooltips || !stageData?.metrics) return '';

    const { avgTime, dropOff, retryRate } = stageData.metrics;
    return `
      <div class="journey-tooltip">
        <div class="tooltip-row">
          <span class="tooltip-label">Avg Time:</span>
          <span class="tooltip-value">${avgTime || '-'}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Drop-off:</span>
          <span class="tooltip-value">${dropOff || '-'}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Retry Rate:</span>
          <span class="tooltip-value">${retryRate || '-'}</span>
        </div>
      </div>
    `;
  }

  /**
   * Build activity cell HTML
   */
  buildActivityCell(stageData, stageId, cellIndex) {
    const stageConfig = this.getStageConfig(stageId);

    if (!stageData?.hasData) {
      return `<div class="journey-cell activity-cell no-data" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <span class="text-muted">No data</span>
      </div>`;
    }

    const activity = stageData.activity || { icon: stageConfig?.icon || 'help', text: 'Activity recorded' };
    return `
      <div class="journey-cell activity-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <div class="activity-icon">
          <i class="material-symbols-rounded">${activity.icon}</i>
        </div>
        <div class="activity-text">${activity.text}</div>
        ${this.buildTooltip(stageData)}
      </div>
    `;
  }

  /**
   * Build satisfaction cell HTML
   */
  buildSatisfactionCell(stageData, stageId, cellIndex) {
    if (!stageData?.hasData) {
      return `<div class="journey-cell satisfaction-cell no-data" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <span class="text-muted">\u{2014}</span>
      </div>`;
    }

    const score = stageData.satisfaction;
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
    if (!stageData?.hasData || !stageData.experiences || stageData.experiences.length === 0) {
      return `<div class="journey-cell experience-cell no-data" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <span class="text-muted">No issues detected</span>
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
    if (!stageData?.hasData) {
      return `<div class="journey-cell expectation-cell no-data" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        <span class="text-muted">\u{2014}</span>
      </div>`;
    }

    const expectation = stageData.expectation || 'Completed';

    return `
      <div class="journey-cell expectation-cell" data-stage="${stageId}" style="--cell-index: ${cellIndex}">
        ${expectation}
        ${this.buildTooltip(stageData)}
      </div>
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
      </div>
    `;
  }

  /**
   * Render the matrix in mobile view (stacked cards)
   */
  renderMobile() {
    return this.stages.map(stage => {
      const stageData = this.data[stage.id];

      if (!stageData?.hasData) {
        return `
          <div class="mobile-stage-card">
            <div class="mobile-stage-header" style="background: ${stage.color}">
              ${stage.name}
            </div>
            <div class="mobile-stage-content">
              <p class="text-muted text-center py-3">No data for this stage</p>
            </div>
          </div>
        `;
      }

      const satisfaction = stageData.satisfaction;
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
                ${stageData.activity?.text || '-'}
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
                ${stageData.experiences?.length > 0
                  ? stageData.experiences.map(exp => `<div class="${exp.type}">${exp.text}</div>`).join('')
                  : 'No issues detected'}
              </div>
            </div>
            <div class="mobile-row">
              <div class="mobile-row-label">Expectation</div>
              <div class="mobile-row-value">
                ${stageData.expectation || '-'}
              </div>
            </div>
            ${stageData.metrics ? `
            <div class="mobile-row">
              <div class="mobile-row-label">Metrics</div>
              <div class="mobile-row-value">
                <small>Time: ${stageData.metrics.avgTime} | Retry: ${stageData.metrics.retryRate}</small>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render empty state when no data
   */
  renderEmptyState() {
    return `
      <div class="user-journey-matrix">
        <div class="user-journey-matrix-header">
          <div class="user-journey-matrix-title">
            <i class="material-symbols-rounded">route</i>
            User Journey Experience Matrix
          </div>
        </div>
        <div class="journey-empty-state" style="text-align: center; padding: 3rem;">
          <i class="material-symbols-rounded" style="font-size: 3rem; color: #9e9e9e;">analytics</i>
          <p class="text-muted mt-3">No journey data available for this session</p>
          <small class="text-muted">Journey analysis will appear when SDK events are captured</small>
        </div>
      </div>
    `;
  }

  /**
   * Main render method
   */
  render() {
    if (!this.container) {
      console.error(`UserJourneyExperienceMatrix: Container #${this.containerId} not found`);
      return;
    }

    // Check if we have any data
    if (!this.hasData) {
      this.container.innerHTML = this.renderEmptyState();
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
   * Update data from SDK analytics events - ALL data derived from real events
   * @param {Array} events - SDK analytics events
   * @param {Object} flowMetrics - Flow metrics from calculateFlowMetrics
   */
  updateFromSDKData(events, flowMetrics = {}) {
    // Reset to empty data
    this.data = this.getEmptyData();
    this.hasData = false;

    if (!events || events.length === 0) {
      this.render();
      return;
    }

    // Group events by stage
    const stageEvents = {};
    this.stages.forEach(stage => {
      stageEvents[stage.id] = [];
    });

    // Categorize each event into a stage
    events.forEach(event => {
      const eventType = event.type || event.event || event.name || '';
      const stageId = this.mapEventToStage(eventType);

      if (stageId) {
        stageEvents[stageId].push(event);
      }
    });

    // If no events mapped to stages, try to infer from flow metrics
    const hasAnyEvents = Object.values(stageEvents).some(arr => arr.length > 0);

    if (!hasAnyEvents && flowMetrics.totalDuration > 0) {
      // Create synthetic entry based on flow metrics
      if (flowMetrics.timeToFirstInteraction > 0) {
        stageEvents['entry'].push({
          type: 'INIT',
          status: 'success',
          duration: flowMetrics.timeToFirstInteraction * 1000
        });
      }
    }

    // Process each stage
    this.stages.forEach(stage => {
      const stageEvts = stageEvents[stage.id];

      if (stageEvts.length === 0) {
        // Check flow metrics for this stage
        if (stage.id === 'document' && flowMetrics.documentScanTime > 0) {
          stageEvts.push({
            type: 'SCAN',
            status: 'success',
            duration: flowMetrics.documentScanTime
          });
        }
        if (stage.id === 'face' && flowMetrics.faceScanTime > 0) {
          stageEvts.push({
            type: 'FACE',
            status: 'success',
            duration: flowMetrics.faceScanTime
          });
        }
        if (stage.id === 'document' && flowMetrics.nfcReadTime > 0) {
          stageEvts.push({
            type: 'NFC',
            status: 'success',
            duration: flowMetrics.nfcReadTime
          });
        }
      }

      if (stageEvts.length === 0) {
        return; // No data for this stage
      }

      this.hasData = true;

      // Calculate metrics for this stage
      const totalDuration = stageEvts.reduce((sum, e) => sum + (e.duration || 0), 0);
      const avgDuration = totalDuration / stageEvts.length;
      const failures = stageEvts.filter(e => {
        const status = (e.status || '').toLowerCase();
        return status === 'failure' || status === 'failed';
      }).length;
      const retryRate = (failures / stageEvts.length) * 100;
      const dropOffRate = failures > 0 ? (failures / stageEvts.length) * 100 : 0;

      const metrics = {
        avgDuration,
        retryRate,
        dropOffRate,
        avgTime: this.formatDuration(avgDuration),
        dropOff: `${Math.round(dropOffRate)}%`,
        retryRate: `${Math.round(retryRate)}%`,
        eventCount: stageEvts.length
      };

      // Build stage data from real events
      this.data[stage.id] = {
        activity: this.deriveActivityFromEvents(stageEvts, stage.id),
        satisfaction: this.calculateSatisfactionFromMetrics(metrics),
        experiences: this.deriveExperiencesFromEvents(stageEvts, stage.id),
        expectation: this.deriveExpectationFromEvents(stageEvts, stage.id, metrics),
        metrics: metrics,
        events: stageEvts,
        hasData: true
      };
    });

    this.render();
  }

  /**
   * Format duration in milliseconds to human readable
   */
  formatDuration(ms) {
    if (!ms || ms === 0) return '-';
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
