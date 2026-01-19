# Uqudo Analytics Demo Portal - Implementation Requirements

## Overview

This document specifies KPIs and metrics for the Uqudo Analytics demo portal built on Vercel. It covers both Session-level and Portfolio-level dashboards.

**Platform**: Vercel (vibe-coding)
**Purpose**: Demonstrate SDK analytics capabilities to prospective customers

---

## Data Source Configuration

### Placeholder: Data Connection

```
DATA_SOURCE_TYPE: {{PLACEHOLDER: supabase | firebase | planetscale | other}}
CONNECTION_STRING: {{PLACEHOLDER: connection details}}
```

### Required Data Tables/Collections

| Table | Description | Primary Key |
|-------|-------------|-------------|
| sessions | Individual onboarding sessions | sessionId |
| events | Analytics tracer events | eventId |
| devices | Device profiles | deviceIdentifier |
| verification_results | Verification object data | sessionId |

---

## SESSION DASHBOARD

### Page Route
```
/sessions/[sessionId]
```

### Session Header Component

| Field | Source | Type | Display |
|-------|--------|------|---------|
| sessionId | sessions.sessionId | UUID | Text (truncated with copy) |
| deviceIdentifier | sessions.deviceIdentifier | UUID | Text (truncated with copy) |
| documentType | verification_results.documentType | Enum | Badge |
| finalOutcome | Derived | Enum | Badge (color-coded) |
| riskAssessment | Calculated | Enum | Badge (APPROVE/REVIEW/REJECT) |
| sessionDuration | Calculated | Seconds | Formatted (MM:SS) |
| platform | sessions.platform | Enum | Badge |
| timestamp | sessions.created_at | DateTime | Formatted |

**Outcome Badge Colors**:
- SUCCESS: green
- FAILED: red
- ABANDONED: yellow

**Risk Badge Colors**:
- APPROVE: green
- REVIEW: orange
- REJECT: red

---

### Tab 1: Verification Summary

#### Document Verification Panel

| Metric | Source Field | Threshold | Display |
|--------|--------------|-----------|---------|
| Screen Detection Score | verification.idScreenDetection.score | >50 = FAIL | Score/100 with status |
| Print Detection Score | verification.idPrintDetection.score | >50 = FAIL | Score/100 with status |
| Photo Tampering Score | verification.idPhotoTamperingDetection.score | >70 = FAIL, >40 = WARN | Score/100 with status |
| Optimal Resolution | verification.sourceDetection.optimalResolution | false = WARN | Boolean badge |
| MRZ Checksum | verification.mrzChecksum.valid | false = FAIL | Boolean badge |
| Data Consistency | verification.dataConsistencyCheck.fields[].match | NO_MATCH = FAIL | Field list |

#### Biometric Panel

| Metric | Source Field | Threshold | Display |
|--------|--------------|-----------|---------|
| Face Match Level | verification.biometric.matchLevel | <3 = FAIL | Score/5 with bar |
| Liveness Check | Derived (no FACE_LIVENESS_FAILED in events) | Any failure = FAIL | Boolean badge |

#### Chip Reading Panel (conditional: show if NFC step exists)

| Metric | Source Field | Display |
|--------|--------------|---------|
| Passive Auth Enabled | verification.reading.passiveAuthentication.enabled | Boolean badge |
| Document Signature Valid | verification.reading.passiveAuthentication.documentDataSignatureValid | Boolean badge |
| Chip Auth Enabled | verification.reading.chipAuthentication.enabled | Boolean badge |

---

### Tab 2: Journey Fraud Flags

#### Fraud Flag Summary Table

| Column | Source | Notes |
|--------|--------|-------|
| Flag Type | statusCode from events where status=FAILURE | Grouped |
| Count | COUNT of occurrences | Number |
| Timestamps | Array of event timestamps | Time list |
| Severity | Mapped from statusCode | Badge |

**Severity Mapping**:

| StatusCode | Severity | Color |
|------------|----------|-------|
| FACE_LIVENESS_FAILED | CRITICAL | red |
| FACE_NO_MATCH | CRITICAL | red |
| SCAN_DOCUMENT_ID_PHOTO_TAMPERING_DETECTED | CRITICAL | red |
| SCAN_DOCUMENT_SCREEN_DETECTED | HIGH | orange |
| SCAN_DOCUMENT_PRINT_DETECTED | HIGH | orange |
| SCAN_DOCUMENT_FRONT_BACK_MISMATCH | HIGH | orange |
| READ_AUTHENTICATION_FAILED | HIGH | orange |
| FACE_MULTIPLE_FACES_DETECTED | HIGH | orange |
| FACE_RECOGNITION_TOO_MANY_ATTEMPTS | HIGH | orange |
| READ_DOCUMENT_VALIDATION_FAILED | HIGH | orange |
| SCAN_DOCUMENT_EXPIRED | MEDIUM | yellow |
| SCAN_DOCUMENT_NOT_RECOGNIZED | MEDIUM | yellow |
| SCAN_DOCUMENT_INCORRECT_TYPE_DETECTED | MEDIUM | yellow |
| FACE_TIMEOUT | MEDIUM | yellow |

#### Flag Count Summary Card

```
Layout: 3-column grid

CRITICAL: [count] - red background if > 0
HIGH: [count] - orange background if > 0
MEDIUM: [count] - yellow background if > 0
```

#### Journey Timeline Visualization

```
Component: Horizontal timeline per step (SCAN, READ, FACE)
Data: Events filtered by page, ordered by timestamp
Display:
  - Flag events as red markers with statusCode label
  - Success events as green markers
  - Hover shows timestamp and details
```

#### Risk Score Calculation

```javascript
// Journey Risk Score
let journeyRiskScore = 0;

events.forEach(event => {
  if (event.status === 'FAILURE') {
    const severity = getSeverity(event.statusCode);
    if (severity === 'CRITICAL') journeyRiskScore += 100;
    if (severity === 'HIGH') journeyRiskScore += 50;
    if (severity === 'MEDIUM') journeyRiskScore += 10;
  }
});

// Verification Risk Score
let verificationRiskScore = 0;

if (verification.idPhotoTamperingDetection?.score > 40) verificationRiskScore += 80;
if (verification.idScreenDetection?.score > 30) verificationRiskScore += 40;
if (verification.idPrintDetection?.score > 30) verificationRiskScore += 40;
if (verification.biometric?.matchLevel < 3) verificationRiskScore += 60;
if (!verification.mrzChecksum?.valid) verificationRiskScore += 40;
if (!verification.sourceDetection?.optimalResolution) verificationRiskScore += 20;

verification.dataConsistencyCheck?.fields?.forEach(field => {
  if (field.match === 'NO_MATCH') verificationRiskScore += 50;
});

// Device Risk Score (see Device History tab)
const deviceRiskScore = calculateDeviceRiskScore(deviceHistory);

// Total
const totalRiskScore = journeyRiskScore + verificationRiskScore + deviceRiskScore;
```

#### Risk Level Thresholds

| Level | Score Range | Decision | Color |
|-------|-------------|----------|-------|
| LOW | 0-49 | APPROVE | green |
| MEDIUM | 50-99 | REVIEW | yellow |
| HIGH | 100-199 | REVIEW | orange |
| CRITICAL | 200+ | REJECT | red |

#### Risk Breakdown Display

```
Component: Stacked bar or pie chart
Segments:
  - Verification Risk: [score] ([percentage]%)
  - Journey Risk: [score] ([percentage]%)
  - Device Risk: [score] ([percentage]%)
Total: [totalScore]
```

---

### Tab 3: Device History

#### Device Profile Card

| Metric | Calculation | Display |
|--------|-------------|---------|
| Device ID | deviceIdentifier | UUID (masked: show first 8 chars) |
| First Seen | MIN(timestamp) for device | Date |
| Total Sessions | COUNT sessions for device | Number |
| Successful Sessions | COUNT where outcome=SUCCESS | Number |
| Failed Sessions | COUNT where outcome=FAILED | Number |
| Abandoned Sessions | COUNT where outcome=ABANDONED | Number |
| Success Rate | successful / total * 100 | Percentage |
| Document Types Used | DISTINCT documentType | List of badges |
| Total Historical Fraud Flags | SUM of fraud flags across all sessions | Number |

#### Previous Sessions Table

| Column | Source | Display |
|--------|--------|---------|
| Date | session.timestamp | Formatted date |
| Outcome | session.outcome | Badge (color-coded) |
| Duration | session.duration | MM:SS |
| Fraud Flags | COUNT of flags in session | Number |
| Document Type | session.documentType | Badge |
| Failure Reason | Primary statusCode if failed | Text |

#### Device Risk Indicators

| Indicator | Condition | Points | Display |
|-----------|-----------|--------|---------|
| Multiple Attempts | totalSessions > 2 | +30 | Warning badge if true |
| Low Success Rate | successRate < 50% | +40 | Warning badge if true |
| Document Switching | documentTypesUsed.length > 1 | +50 | Warning badge if true |
| Rapid Retry | Any sessions within 1 hour | +30 | Warning badge if true |
| High Fraud Flags | totalHistoricalFlags > 5 | +20 per 5 | Warning badge if true |
| Previous Rejection | Any previous FAILED outcome | +50 | Warning badge if true |

#### Device Risk Score Calculation

```javascript
function calculateDeviceRiskScore(deviceHistory) {
  let score = 0;

  if (deviceHistory.totalSessions > 2) score += 30;
  if (deviceHistory.successRate < 0.5) score += 40;
  if (deviceHistory.documentTypesUsed.length > 1) score += 50;
  if (deviceHistory.hasRapidRetry) score += 30;
  score += Math.floor(deviceHistory.totalHistoricalFlags / 5) * 20;
  if (deviceHistory.hasPreviousRejection) score += 50;

  return score;
}
```

#### Device Alert Banner

```
Condition: Show if totalSessions > 1
Style: Yellow/orange background
Content:
  "This device has [X] previous onboarding attempts"
  "Success Rate: [Y]%"
  "Previous Fraud Flags: [Z]"
```

---

### Tab 4: UX Analysis

#### Session Flow Metrics

| Metric | Calculation | Benchmark | Display |
|--------|-------------|-----------|---------|
| Total Duration | FINISH.timestamp - INIT.timestamp | {{PLACEHOLDER: benchmark}} | MM:SS with comparison |
| Time to First Interaction | First user event - INIT.timestamp | {{PLACEHOLDER: benchmark}} | Seconds |
| Document Scan Time | SCAN COMPLETE - SCAN START | {{PLACEHOLDER: benchmark}} | Seconds |
| NFC Reading Time | READ COMPLETE - READ START | {{PLACEHOLDER: benchmark}} | Seconds |
| Face Verification Time | FACE COMPLETE - FACE START | {{PLACEHOLDER: benchmark}} | Seconds |
| Background Check Time | BGC COMPLETE - BGC START | {{PLACEHOLDER: benchmark}} | Seconds |

#### Friction Score Calculation

```javascript
function calculateFrictionScore(step) {
  const benchmark = getBenchmark(step); // {{PLACEHOLDER: define benchmarks}}

  const attemptPenalty = (step.attempts - 1) * 20;
  const durationPenalty = Math.max(0, (step.duration / benchmark - 1)) * 30;
  const issuePenalty = step.issueCount * 10;

  return attemptPenalty + durationPenalty + issuePenalty;
}

// Friction Levels
// LOW: 0-30
// MEDIUM: 31-70
// HIGH: 71+
```

#### Friction Score Display

| Step | Score | Level | Issues | Color |
|------|-------|-------|--------|-------|
| Document Scan | [calculated] | LOW/MEDIUM/HIGH | [list] | green/yellow/red |
| NFC Reading | [calculated] | LOW/MEDIUM/HIGH | [list] | green/yellow/red |
| Face Verification | [calculated] | LOW/MEDIUM/HIGH | [list] | green/yellow/red |
| Background Check | [calculated] | LOW/MEDIUM/HIGH | [list] | green/yellow/red |

#### Environment Issues

| Issue Type | StatusCode | Count | Display |
|------------|------------|-------|---------|
| Dark Environment | *_DARK_ENVIRONMENT_DETECTED | COUNT | Number with icon |
| Blur Detected | *_BLUR_DETECTED | COUNT | Number with icon |
| Glare Detected | *_GLARE_DETECTED | COUNT | Number with icon |
| Position Issues | *_INCORRECT_POSITION_DETECTED | COUNT | Number with icon |
| Distance Issues | *_INCORRECT_DISTANCE_DETECTED | COUNT | Number with icon |

#### Conversion Funnel (Single Session)

```
Component: Vertical progress bar
Steps: SDK Init -> Scan Start -> Scan Done -> NFC Start -> NFC Done -> Face Start -> Face Done -> BGC -> Complete
Display:
  - Green for completed steps
  - Red for failed step (with reason)
  - Gray for not reached
  - Show drop-off point if applicable
```

#### Comparative Metrics

| Metric | This Session | Portfolio Avg | Percentile |
|--------|--------------|---------------|------------|
| Duration | [value] | {{PLACEHOLDER: avg}} | [calculated] |
| Scan Attempts | [value] | {{PLACEHOLDER: avg}} | [calculated] |
| Face Attempts | [value] | {{PLACEHOLDER: avg}} | [calculated] |
| Environment Issues | [value] | {{PLACEHOLDER: avg}} | [calculated] |
| Overall Friction | [level] | {{PLACEHOLDER: avg}} | [calculated] |

---

### Step Summary Panel (All Tabs)

| Step | Status | Attempts | Duration | Flags | Friction | Score |
|------|--------|----------|----------|-------|----------|-------|
| Scan | Badge | Number | MM:SS | Number | Badge | Value |
| NFC | Badge | Number | MM:SS | Number | Badge | Value |
| Face | Badge | Number | MM:SS | Number | Badge | Value |
| BGC | Badge | Number | MM:SS | Number | Badge | N/A |

---

### Session JSON Export Structure

```json
{
  "sessionId": "uuid",
  "deviceIdentifier": "uuid",
  "timestamp": "ISO8601",
  "platform": "Android|iOS",

  "outcome": {
    "finalStatus": "SUCCESS|FAILED|ABANDONED",
    "sessionDuration": 154
  },

  "verification": {
    "documentType": "PASSPORT",
    "idScreenDetection": {"enabled": true, "score": 12},
    "idPrintDetection": {"enabled": true, "score": 8},
    "idPhotoTamperingDetection": {"enabled": true, "score": 15},
    "sourceDetection": {"optimalResolution": true},
    "dataConsistencyCheck": {
      "fields": [
        {"name": "fullName", "match": "MATCH"},
        {"name": "documentNumber", "match": "MATCH"}
      ]
    },
    "mrzChecksum": {"valid": true},
    "reading": {
      "enabled": true,
      "passiveAuthentication": {"documentDataSignatureValid": true},
      "chipAuthentication": {"enabled": true}
    },
    "biometric": {
      "enabled": true,
      "matchLevel": 4
    }
  },

  "journeyAnalytics": {
    "totalEvents": 45,
    "stepSummary": {
      "documentScan": {"attempts": 6, "duration": 135, "flagCount": 5},
      "nfcReading": {"attempts": 1, "duration": 8, "flagCount": 0},
      "faceVerification": {"attempts": 4, "duration": 60, "flagCount": 3},
      "backgroundCheck": {"attempts": 1, "duration": 3, "flagCount": 0}
    },
    "fraudFlags": [
      {"code": "SCAN_DOCUMENT_SCREEN_DETECTED", "severity": "HIGH", "count": 3},
      {"code": "FACE_NO_MATCH", "severity": "CRITICAL", "count": 2}
    ]
  },

  "deviceHistory": {
    "firstSeen": "ISO8601",
    "totalSessions": 4,
    "successfulSessions": 1,
    "failedSessions": 2,
    "abandonedSessions": 1,
    "successRate": 0.25,
    "documentTypesUsed": ["PASSPORT", "EMIRATES_ID"],
    "totalHistoricalFraudFlags": 12,
    "deviceRiskScore": 170
  },

  "userExperience": {
    "totalDuration": 154,
    "frictionAnalysis": {
      "documentScan": {"score": 85, "level": "HIGH"},
      "nfcReading": {"score": 10, "level": "LOW"},
      "faceVerification": {"score": 55, "level": "MEDIUM"},
      "backgroundCheck": {"score": 5, "level": "LOW"}
    },
    "environmentIssues": {
      "darkEnvironment": 2,
      "blur": 3,
      "glare": 1,
      "position": 4
    }
  },

  "riskAssessment": {
    "verificationRiskScore": 20,
    "journeyRiskScore": 250,
    "deviceRiskScore": 170,
    "totalRiskScore": 440,
    "riskLevel": "CRITICAL",
    "recommendedDecision": "REVIEW"
  }
}
```

---

## PORTFOLIO DASHBOARD

### Page Route
```
/analytics
```

### Global Filters

| Filter | Type | Default | Options |
|--------|------|---------|---------|
| Date Range | Date Picker | Last 30 days | Today, 7d, 30d, 90d, Custom, All |
| Platform | Multi-select | All | Android, iOS |
| Document Type | Multi-select | All | {{PLACEHOLDER: available types}} |
| Risk Level | Multi-select | All | Low, Medium, High, Critical |
| Outcome | Multi-select | All | Success, Failed, Abandoned |

---

### Tab 1: Overview

#### KPI Cards (6 cards in row)

| KPI | Calculation | Target | Format |
|-----|-------------|--------|--------|
| Total Sessions | COUNT(sessions) in period | - | Number with trend |
| Completion Rate | (SUCCESS / Total) * 100 | >85% | Percentage with trend |
| Abandonment Rate | (ABANDONED / Total) * 100 | <10% | Percentage with trend |
| Fraud Detection Rate | (Sessions with CRITICAL/HIGH flags / Total) * 100 | - | Percentage with trend |
| Unique Devices | COUNT(DISTINCT deviceIdentifier) | - | Number with trend |
| Review Rate | (Sessions flagged for review / Total) * 100 | <20% | Percentage with trend |

**Trend Calculation**: Compare current period to previous period of same length

#### Conversion Funnel Chart

```
Component: Horizontal funnel or bar chart
Data:
  - Sessions Started: COUNT(INIT events)
  - Document Scan Start: COUNT(SCAN START events)
  - Document Scan Done: COUNT(SCAN COMPLETE + SUCCESS events)
  - NFC Start: COUNT(READ START events)
  - NFC Done: COUNT(READ COMPLETE + SUCCESS events)
  - Face Start: COUNT(FACE START events)
  - Face Done: COUNT(FACE COMPLETE + SUCCESS events)
  - Completed: COUNT(FINISH + SUCCESS events)

Display: Show count and percentage, highlight biggest drop-off
```

#### Risk Distribution Chart

```
Component: Donut chart
Segments:
  - LOW (0-49): green
  - MEDIUM (50-99): yellow
  - HIGH (100-199): orange
  - CRITICAL (200+): red
Data: Group sessions by totalRiskScore
```

#### Trend Sparklines

| Metric | Data Points |
|--------|-------------|
| Daily Sessions | Last 30 days |
| Completion Rate | Last 30 days |
| Fraud Rate | Last 30 days |

---

### Tab 2: UX Analysis

#### Friction Score by Step

| Step | Avg Friction Score | High Friction % | Trend |
|------|-------------------|-----------------|-------|
| Document Scan | AVG(friction_scan) | COUNT where >70 / Total | Sparkline |
| NFC Reading | AVG(friction_nfc) | COUNT where >70 / Total | Sparkline |
| Face Verification | AVG(friction_face) | COUNT where >70 / Total | Sparkline |
| Background Check | AVG(friction_bgc) | COUNT where >70 / Total | Sparkline |

```
Component: Bar chart with friction level colors
```

#### Friction Distribution Table

| Friction Level | Sessions | % | Avg Duration | Completion Rate |
|----------------|----------|---|--------------|-----------------|
| LOW (0-30) | COUNT | % | AVG | % |
| MEDIUM (31-70) | COUNT | % | AVG | % |
| HIGH (71+) | COUNT | % | AVG | % |

#### User Behavior Segments

| Segment | Definition | Sessions | % | Completion |
|---------|------------|----------|---|------------|
| Quick Completer | Duration < P25, attempts = 1 per step | COUNT | % | % |
| Persistent Retrier | Multiple attempts, eventually success | COUNT | % | % |
| Early Abandoner | Abandoned at first step | COUNT | % | 0% |
| Mid-Journey Drop | Abandoned after scan | COUNT | % | 0% |
| Slow but Steady | Duration > P75, completed | COUNT | % | % |

```
Component: Pie chart or horizontal bar chart
```

#### Time of Day Analysis

| Time Window | Sessions | Completion Rate | Avg Duration |
|-------------|----------|-----------------|--------------|
| 00:00-06:00 | COUNT | % | MM:SS |
| 06:00-12:00 | COUNT | % | MM:SS |
| 12:00-18:00 | COUNT | % | MM:SS |
| 18:00-24:00 | COUNT | % | MM:SS |

```
Component: Bar chart with completion rate overlay line
```

#### Environment Issues Summary

| Issue | Sessions Affected | % of Total | Impact on Completion |
|-------|-------------------|------------|---------------------|
| Position Issues | COUNT with any POSITION statusCode | % | {{PLACEHOLDER: calculate}} |
| Blur Detected | COUNT with any BLUR statusCode | % | {{PLACEHOLDER: calculate}} |
| Dark Environment | COUNT with any DARK statusCode | % | {{PLACEHOLDER: calculate}} |
| Glare Detected | COUNT with any GLARE statusCode | % | {{PLACEHOLDER: calculate}} |

#### UX Recommendations (Auto-generated)

```javascript
function generateUXRecommendations(portfolioData) {
  const recommendations = [];

  // High friction step
  const stepFriction = calculateStepFriction(portfolioData);
  const highestFriction = Object.entries(stepFriction)
    .sort((a, b) => b[1] - a[1])[0];

  if (highestFriction[1] > 50) {
    recommendations.push({
      priority: 'HIGH',
      area: highestFriction[0],
      issue: `${highestFriction[1].toFixed(0)} avg friction score`,
      recommendation: getRecommendation(highestFriction[0])
    });
  }

  // Time-based issues
  const timeAnalysis = analyzeTimePatterns(portfolioData);
  if (timeAnalysis.worstCompletion < 0.8) {
    recommendations.push({
      priority: 'MEDIUM',
      area: 'Time Patterns',
      issue: `${timeAnalysis.worstWindow} has ${(timeAnalysis.worstCompletion * 100).toFixed(0)}% completion`,
      recommendation: 'Consider optimizing for this time window'
    });
  }

  return recommendations;
}
```

---

### Tab 3: Fraud & Risk

#### Fraud Flag Distribution

| Flag | Count | % of Sessions | Severity | Trend |
|------|-------|---------------|----------|-------|
| FACE_NO_MATCH | COUNT | % | CRITICAL | Sparkline |
| FACE_LIVENESS_FAILED | COUNT | % | CRITICAL | Sparkline |
| SCAN_DOCUMENT_ID_PHOTO_TAMPERING | COUNT | % | CRITICAL | Sparkline |
| SCAN_DOCUMENT_SCREEN_DETECTED | COUNT | % | HIGH | Sparkline |
| SCAN_DOCUMENT_PRINT_DETECTED | COUNT | % | HIGH | Sparkline |
| ... | ... | ... | ... | ... |

```
Component: Treemap grouped by severity, or sortable table
```

#### Journey vs Outcome Analysis

| Category | Sessions | % of Completed | Description |
|----------|----------|----------------|-------------|
| Clean Journey + Success | COUNT | % | Auto-approve candidates |
| Flagged Journey + Success | COUNT | % | Review required |
| Flagged Journey + Failed | COUNT | N/A | Already rejected |

**Key Insight Display**:
```
Alert box: "[X]% of successful sessions had fraud flags during journey"
"These require manual review despite successful outcome"
```

#### Fraud by Document Type

| Document Type | Sessions | Fraud Rate | Top Flag |
|---------------|----------|------------|----------|
| PASSPORT | COUNT | % with flags | Most common |
| EMIRATES_ID | COUNT | % with flags | Most common |
| ... | ... | ... | ... |

```
Component: Bar chart comparing fraud rates
```

#### Risk Score Trends

```
Component: Line chart
Series:
  - Avg Verification Risk Score
  - Avg Journey Risk Score
  - Avg Device Risk Score
  - Avg Total Risk Score
X-axis: Time (daily)
```

---

### Tab 4: Devices

#### Device KPI Cards

| KPI | Calculation | Display |
|-----|-------------|---------|
| Total Unique Devices | COUNT(DISTINCT deviceIdentifier) | Number |
| Single-Session Devices | COUNT where sessions = 1 | Number (%) |
| Multi-Session Devices | COUNT where sessions > 1 | Number (%) |
| Avg Sessions per Device | Total sessions / Unique devices | Number |
| Devices with Fraud Flags | COUNT where any fraud flag | Number (%) |

#### Device Segments Table

| Segment | Definition | Devices | % | Success Rate | Fraud Rate |
|---------|------------|---------|---|--------------|------------|
| One-Time Success | 1 session, successful | COUNT | % | 100% | % |
| One-Time Failure | 1 session, failed | COUNT | % | 0% | % |
| Retry Success | >1 session, any success | COUNT | % | % | % |
| Retry Failure | >1 session, all failed | COUNT | % | 0% | % |
| Persistent Failure | 5+ sessions, all failed | COUNT | % | 0% | % |
| Document Switcher | Multiple doc types | COUNT | % | % | % |

```
Component: Treemap with segment sizes and risk color coding
```

#### Multi-Session Analysis

| Sessions per Device | Devices | Avg Success Rate | Avg Fraud Flags |
|--------------------|---------|--------------------|-----------------|
| 1 | COUNT | % | AVG |
| 2 | COUNT | % | AVG |
| 3 | COUNT | % | AVG |
| 4 | COUNT | % | AVG |
| 5+ | COUNT | % | AVG |

```
Component: Bar chart with success rate trend line
```

#### Device Risk Distribution

| Risk Level | Score Range | Devices | % |
|------------|-------------|---------|---|
| LOW | 0-29 | COUNT | % |
| MEDIUM | 30-69 | COUNT | % |
| HIGH | 70-149 | COUNT | % |
| CRITICAL | 150+ | COUNT | % |

```
Component: Horizontal stacked bar or donut
```

#### Device Watchlist Table

| Rank | Device ID | Sessions | Failures | Fraud Flags | Risk Score | Status |
|------|-----------|----------|----------|-------------|------------|--------|
| 1 | Masked UUID | Number | Number | Number | Number | Badge |
| 2 | ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... | ... |

```
Query: ORDER BY risk_score DESC LIMIT 10
Status values: BLOCKED (score > 200), WATCHLIST (score > 100), WARNING (score > 50)
```

---

### Tab 5: Operations

#### Volume Trend Chart

```
Component: Line chart
Series:
  - Daily session count
  - 7-day moving average
X-axis: Date
Secondary Y-axis: Completion count
```

#### Peak Usage Heatmap

```
Component: Heatmap
X-axis: Day of week (Mon-Sun)
Y-axis: Hour of day (0-23)
Value: Session count
Color: Gradient (low to high volume)
```

#### Session Outcomes Breakdown

| Outcome | Count | % | Trend |
|---------|-------|---|-------|
| Completed Successfully | COUNT | % | Sparkline |
| Failed - Document Issues | COUNT | % | Sparkline |
| Failed - NFC Issues | COUNT | % | Sparkline |
| Failed - Face Verification | COUNT | % | Sparkline |
| User Cancelled | COUNT | % | Sparkline |
| Session Expired | COUNT | % | Sparkline |
| Unexpected Error | COUNT | % | Sparkline |

```
Component: Stacked area chart over time or table with sparklines
```

#### Failure Root Cause Analysis

| Failure Reason | Count | % of Failures |
|----------------|-------|---------------|
| SCAN_DOCUMENT_NOT_RECOGNIZED | COUNT | % |
| FACE_NO_MATCH | COUNT | % |
| USER_CANCEL | COUNT | % |
| ... | ... | ... |

```
Component: Pareto chart (bar + cumulative line)
```

#### NFC Utilization

| Metric | Count | % |
|--------|-------|---|
| Sessions with NFC step | COUNT | % |
| NFC Completed | COUNT | % |
| NFC Skipped (device unsupported) | COUNT | % |
| NFC Skipped (document unsupported) | COUNT | % |
| NFC Failed | COUNT | % |

```
Component: Sankey diagram or stacked bar
```

#### Error Monitoring

| Error Type | Count | Rate | Trend |
|------------|-------|------|-------|
| SESSION_EXPIRED | COUNT | % | Sparkline |
| UNEXPECTED_ERROR | COUNT | % | Sparkline |
| CAMERA_NOT_AVAILABLE | COUNT | % | Sparkline |
| CAMERA_PERMISSION_NOT_GRANTED | COUNT | % | Sparkline |

---

## UI Components Library

### Recommended Components

| Component | Library | Notes |
|-----------|---------|-------|
| Charts | {{PLACEHOLDER: recharts | chart.js | tremor}} | Choose one |
| Data Tables | {{PLACEHOLDER: tanstack-table | ag-grid}} | Sortable, filterable |
| Date Picker | {{PLACEHOLDER: react-datepicker | shadcn}} | Range selection |
| Badges | {{PLACEHOLDER: shadcn | tailwind}} | Status indicators |
| Cards | {{PLACEHOLDER: shadcn | tailwind}} | KPI cards |
| Tabs | {{PLACEHOLDER: shadcn | headless-ui}} | Dashboard navigation |

### Color Palette

| Purpose | Color | Hex |
|---------|-------|-----|
| Success | Green | {{PLACEHOLDER: #10B981}} |
| Warning | Yellow | {{PLACEHOLDER: #F59E0B}} |
| Danger | Orange | {{PLACEHOLDER: #F97316}} |
| Error | Red | {{PLACEHOLDER: #EF4444}} |
| Info | Blue | {{PLACEHOLDER: #3B82F6}} |
| Neutral | Gray | {{PLACEHOLDER: #6B7280}} |

---



## Placeholder Summary

Items requiring input from platform developer:

| Item | Location | Notes |
|------|----------|-------|
| Data source type | Data Source Configuration | supabase/firebase/etc |
| Connection string | Data Source Configuration | Credentials |
| Benchmark values | UX Analysis | Duration benchmarks per step |
| Portfolio averages | Comparative Metrics | Historical averages |
| Chart library | UI Components | recharts/chart.js/tremor |
| Table library | UI Components | tanstack/ag-grid |
| UI framework | UI Components | shadcn/tailwind/chakra |
| Color palette | UI Components | Brand colors |
| Sample data strategy | Sample Data | Static/seeded/mock |
| Caching strategy | Performance | Implementation specific |
| Available document types | Global Filters | Customer-specific |