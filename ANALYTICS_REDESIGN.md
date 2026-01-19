# Analytics Page Redesign - Session-Focused Journey View

## Overview

The Analytics page has been redesigned from an account-centric view to a **session-focused journey visualization** that displays trace events, document types, and comprehensive risk scoring.

## Key Changes

### 1. Table Column Updates

**Old Columns (Account-Focused):**
- Account (Name + Email)
- Document
- Status
- Risk
- Duration
- Platform
- Created
- Actions

**New Columns (Session-Focused):**
- **Session ID** - Shows sessionId from SDK source + user name
- **Journey Flow** - Visual timeline of trace events with durations
- **Document Type** - Clearly displayed with formatted badge
- **Total Duration** - Sum of all event durations with time icon
- **Risk Score** - Comprehensive 0-100 score from all verification scores
- **Platform** - SDK platform (Web/Android/iOS)
- **Submitted** - Timestamp
- **Actions** - View details modal

### 2. Visual Journey Flow

Each session now displays a visual timeline of trace events:

```
VIEW (0.0s) → START (8.2s) → NFC_READING (1.5s) → FACE_MATCH (2.3s) → FINISH (0.4s) [4 events]
```

**Features:**
- Color-coded badges based on event status:
  - Green: SUCCESS
  - Red: FAILURE/FAILED
  - Orange: PENDING
- Duration shown for each event in seconds
- Event count badge at the end
- Arrows between events for visual flow
- Hover effect to highlight events
- Responsive wrapping for long journeys

### 3. Comprehensive Risk Scoring

**New Risk Calculation includes ALL verification scores:**

#### Fraud Detection Scores (0-100, inverted):
- **idScreenDetection.score** - Detects if ID is on screen vs physical
  - Higher score = Higher risk (document on screen)
  - Weight: Inverted (100 - score)

- **idPrintDetection.score** - Detects if ID is printed copy vs original
  - Higher score = Higher risk (printed copy)
  - Weight: Inverted (100 - score)

- **idPhotoTamperingDetection.score** - Detects if ID photo has been altered
  - Higher score = Higher risk (tampered photo)
  - Weight: Inverted (100 - score)

#### Source Detection:
- **optimalResolution** - Boolean check for optimal image quality
  - Optimal: +100 points
  - Sub-optimal: +80 points (20 point penalty)

- **allowNonPhysicalDocuments** - Whether non-physical docs allowed
  - Not allowed: +0 points
  - Allowed: -10 points (increases risk)

#### Verification Levels:
- **faceMatchLevel** (HIGH/MEDIUM/LOW)
  - HIGH: 95 points
  - MEDIUM: 75 points
  - LOW: 50 points

- **livenessLevel** (HIGH/MEDIUM/LOW)
  - HIGH: 95 points
  - MEDIUM: 75 points
  - LOW: 50 points

#### Document Validity:
- **documentValid** - Boolean
  - Valid: 100 points
  - Invalid: 0 points

- **mrzValid** - Boolean (Machine Readable Zone)
  - Valid: 100 points
  - Invalid: 0 points

#### Event Failure Penalty:
- Each FAILURE event in trace: -15 points (max -50)

**Final Risk Score:**
- Average of all available scores (0-100)
- **90-100**: Low Risk (Green badge)
- **70-89**: Medium Risk (Orange badge)
- **0-69**: High Risk (Red badge)

**Risk Score Tooltip:**
Shows breakdown of all scores, e.g.:
```
Screen: 15/100 | Print: 8/100 | Tampering: 5/100 | Face: HIGH | Liveness: HIGH | Doc: Valid | MRZ: Valid
```

### 4. Document Type Extraction

Document type is now extracted from multiple sources (in priority order):

1. **Trace events metadata** - `event.metadata.documentType`
2. **Trace events direct** - `event.documentType`
3. **SDK verifications** - `verifications.documentType`
4. **SDK analytics documents** - `analytics.documents[0].documentType`

**Formatted Display:**
- `GENERIC_ID` → "Generic ID"
- `UAE_ID` → "UAE ID"
- `passport` → "Passport"
- `driving_license` → "Driving License"

### 5. Enhanced Modal View

The session detail modal now includes:

#### Source Detection Section:
- Resolution Quality (Optimal/Sub-optimal)
- Selected Resolution (e.g., "2160x3840")
- Physical Document requirement

#### Enhanced Fraud Detection Scores:
Each fraud score now includes:
- Score value (0-100)
- Visual indicator (⚠️ or ✓)
- Risk interpretation text:
  - Screen Detection: "High risk: Document may be on screen" vs "Low risk: Physical document"
  - Print Detection: "High risk: Printed copy detected" vs "Low risk: Original document"
  - Photo Tampering: "High risk: Photo may be tampered" vs "Low risk: Original photo"

### 6. Styling Improvements

**New CSS Classes:**
```css
.journey-flow - Container for journey visualization
.journey-event - Individual event badges
.journey-arrow - Arrow icons between events
.risk-score-badge - Enhanced risk score styling
```

**Journey Event Styling:**
- Inline-flex layout for proper alignment
- Hover effect (scale 1.05)
- Responsive wrapping
- Color-coded by status
- Font-weight 600 for better readability

## Implementation Details

### Files Modified:

1. **`/pages/uqudo-analytics.html`**
   - Updated table headers (line 433-443)
   - Added journey flow CSS styling (lines 50-75)

2. **`/assets/js/uqudo-analytics.js`**
   - Rewrote `buildSessionsTable()` function (lines 1080+)
   - Added `buildJourneyFlow()` helper (new function)
   - Added `calculateComprehensiveRisk()` helper (new function)
   - Enhanced `openSessionModal()` to show source detection (lines 1452+)
   - Updated modal verification details with enhanced fraud score descriptions

### Key Functions:

#### `buildJourneyFlow(events)`
```javascript
// Builds visual timeline from trace events
// Returns: HTML string with badges and arrows
// Example: "VIEW (0.0s) → START (8.2s) → FINISH (0.4s) [3 events]"
```

#### `calculateComprehensiveRisk(session)`
```javascript
// Calculates 0-100 risk score from all verification scores
// Returns: { riskScore, riskClass, riskDetails }
// Includes: fraud detection, source detection, verification levels, document validity
```

## Backend Dependency

**IMPORTANT:** The frontend redesign depends on the backend trace events normalization fix.

**Backend Fix Status:**
- ✅ Code committed: "Fix Analytics trace events: normalize Web SDK format and calculate durations"
- ⚠️ **Server restart required** for changes to take effect

**Backend restart command:**
```bash
cd /Users/uqudo/Desktop/Admin\ Portal/ui-master/backend
npm run dev
```

**What the backend fix does:**
1. Normalizes Web SDK trace events from `{event, timestamp}` to `{name, duration, timestamp}`
2. Calculates duration between consecutive events
3. Extracts document type from trace event metadata
4. Stores normalized events in `sdk_analytics` column

## Testing Steps

### 1. Restart Backend Server
```bash
cd backend
npm run dev
```

### 2. Submit New Web SDK Session

Make sure analytics is enabled in SDK config:
```javascript
const config = {
  analytics: { enabled: true }
};
```

### 3. Verify Analytics Page

**Check Table View:**
- Session ID displays correctly (short ID + name)
- Journey Flow shows visual timeline with event badges
- Document Type shows formatted name (not "Unknown")
- Total Duration shows correct sum of event durations
- Risk Score shows 0-100 value (not just LOW/MEDIUM/HIGH)
- All events have duration values

**Check Modal View:**
- Source Detection section appears
- Fraud Detection scores show with descriptions
- Resolution quality displayed
- All verification scores present
- Radar chart includes all 9 metrics

### 4. Test Different Scenarios

**High Risk Session:**
- Submit with high fraud detection scores (>50)
- Should show red risk badge
- Modal should show warning indicators

**Low Risk Session:**
- Submit with low fraud detection scores (<30)
- Should show green risk badge
- Modal should show success indicators

**Multiple Events:**
- Submit with full journey: VIEW → START → NFC_READING → FACE_MATCH → LIVENESS → FINISH
- Should see complete visual timeline
- Each event should show individual duration

## Expected Behavior

### Before Backend Restart:
- Document Type: "Unknown"
- Duration: "00:00"
- Journey Flow: "No trace data" or empty
- Risk Score: Basic calculation only

### After Backend Restart + New Session:
- Document Type: "Generic ID", "UAE ID", etc.
- Duration: Correct sum (e.g., "00:10" for 10 seconds)
- Journey Flow: Full visual timeline with badges and durations
- Risk Score: 0-100 comprehensive score from all verification data

## Example Output

### Table Row Example:
```
┌──────────────┬────────────────────────────────────────────────┬──────────────┬──────────┬──────────┬──────────┬────────────┬─────────┐
│ Session ID   │ Journey Flow                                   │ Document     │ Duration │ Risk     │ Platform │ Submitted  │ Actions │
├──────────────┼────────────────────────────────────────────────┼──────────────┼──────────┼──────────┼──────────┼────────────┼─────────┤
│ d9896439     │ VIEW (0.0s) → START (8.2s) → COMPLETE (1.5s)  │ Generic ID   │ 00:10    │ 87/100   │ Mac OS   │ Just now   │ [View]  │
│ Yahia Elhadi │   → FINISH (0.5s) [4 events]                  │              │          │ (Green)  │          │            │         │
└──────────────┴────────────────────────────────────────────────┴──────────────┴──────────┴──────────┴──────────┴────────────┴─────────┘
```

### Modal Risk Details Example:
```
Source Detection:
✓ Optimal Resolution: 2160x3840
✓ Physical Document Required

Fraud Detection Scores:
🖥️ Screen Detection: 12/100 ✓
   Low risk: Physical document

🖨️ Print Detection: 8/100 ✓
   Low risk: Original document

📸 Photo Tampering: 5/100 ✓
   Low risk: Original photo
```

## Troubleshooting

### Issue: Document Type still shows "Unknown"
**Cause:** Backend not restarted or old sessions still in database
**Solution:**
1. Restart backend server
2. Submit NEW session with analytics enabled
3. Old sessions won't be fixed retroactively

### Issue: Journey Flow shows "No trace data"
**Cause:** Session submitted before backend fix
**Solution:** Submit new session after backend restart

### Issue: Duration still shows "00:00"
**Cause:** Trace events not normalized (Web SDK format still raw)
**Solution:**
1. Verify backend restarted
2. Check backend logs for normalization errors
3. Submit new test session

### Issue: Risk Score not comprehensive (still shows LOW/MEDIUM/HIGH text)
**Cause:** Old frontend code cached
**Solution:**
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
2. Clear browser cache
3. Check browser console for JavaScript errors

### Issue: Events show but no durations
**Cause:** Web SDK sending old format without normalization
**Solution:**
1. Verify backend `normalizeTraceEvents()` function is running
2. Check `sdk_analytics` column in database - should have `duration` field
3. Run debug script: `node backend/debug-android-session.js`

## Future Enhancements

Potential improvements for future versions:

1. **Timeline Chart** - Replace badges with visual timeline chart
2. **Performance Insights** - Highlight slow steps in journey
3. **Comparison View** - Compare current session to average
4. **Export Journey** - Export journey visualization as image
5. **Real-time Journey** - Show journey progress for live sessions
6. **Funnel Analysis** - Show drop-off rates at each step
7. **Device Fingerprinting** - Enhanced device detection scores
8. **Geographical Risk** - Add location-based risk factors

## Conclusion

The Analytics page is now a true session monitoring dashboard that:
- ✅ Focuses on session journeys, not accounts
- ✅ Displays visual event flow with durations
- ✅ Shows document type clearly
- ✅ Calculates comprehensive risk from ALL verification scores
- ✅ Provides detailed fraud detection insights
- ✅ Matches the Performance Journey visualization pattern

The redesign provides better visibility into SDK session quality, verification scores, and fraud detection metrics.
