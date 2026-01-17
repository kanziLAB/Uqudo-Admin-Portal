# Performance Journey Visualization Guide

## Overview

The Performance Journey component provides a visual timeline of SDK verification events, showing the complete flow from document scanning to final verification with timing and status information.

![Performance Journey Example](https://via.placeholder.com/1200x400?text=Performance+Journey+Timeline)

---

## Features

### 1. Timeline Visualization
- **3-step milestone display**: VIEW → START → FINISH
- **Gradient progress bar**: Visual indication from start to completion
- **Color-coded indicators**:
  - 🟢 Green: Successful steps
  - 🔴 Red: Failed steps
  - ⚪ Gray: Pending steps
- **Duration tracking**: Shows time taken for each step
- **Total duration**: Displayed at the end of timeline

### 2. Event Details List
- **Comprehensive event log**: All verification steps in chronological order
- **Expandable cards**: Click to view detailed information
- **Status badges**: SUCCESS / FAILURE / PENDING
- **Metadata display**:
  - Timestamp (exact time of event)
  - Event type (ENROLLMENT, VERIFICATION, etc.)
  - Event ID
  - Duration (time since previous event)

### 3. Event Details (Expandable)
When clicking an event, additional details are shown:
- **Scores**: Face match, liveness, quality scores (0-100%)
- **Confidence levels**: OCR, biometric confidence
- **Methods**: NFC, OCR, visual scanning
- **Device info**: Platform, model
- **Error details**: If step failed

---

## Where to Find It

### Accounts Page
1. Navigate to **Accounts** page
2. Click **"View Details"** on any account
3. Scroll down in the modal
4. **Performance Journey** section appears below account information

### Alerts Page
1. Navigate to **KYC Alerts** page
2. Click **"View"** on any alert
3. Scroll down in the modal
4. **Performance Journey** section appears below alert details

---

## Understanding the Timeline

### Step 1: VIEW (Scan Start)
- User opens the SDK interface
- Document scanning screen displayed
- Usually takes 5-10 seconds

**Example**:
```
VIEW - SCAN
8.2s
✓ Success
```

### Step 2: START (Scanning)
- Document capture begins
- Image processing initiated
- OCR and quality checks performed
- Usually takes 200-500ms

**Example**:
```
START - SCAN
279ms
✓ Success
```

### Step 3: FINISH (Completion)
- Final verification checks
- Background screening (if enabled)
- Results compilation
- May show 0ms if instant

**Example**:
```
FINISH - SCAN
0ms
✗ Failure (if background check match)
✓ Success (if clear)
```

---

## Event Types

### Document Scanning Events
- **VIEW**: Initial screen display
- **START**: Scanning begins
- **DOCUMENT_CAPTURED**: Photo taken
- **DOCUMENT_QUALITY**: Quality assessment
- **OCR**: Text extraction from document

### Biometric Events
- **FACE_CAPTURE**: Selfie taken
- **FACE_QUALITY**: Face image quality check
- **FACE_MATCH**: Comparing face to document photo
- **LIVENESS**: Anti-spoofing check

### NFC Events (for chip-enabled documents)
- **NFC_START**: Chip reading initiated
- **NFC_READING**: Data extraction from chip
- **NFC_COMPLETE**: Chip reading finished
- **PASSIVE_AUTH**: Document authenticity verification

### Verification Events
- **DATA_CONSISTENCY**: Cross-field validation
- **MRZ_CHECK**: Machine-readable zone validation
- **BACKGROUND_CHECK**: PEP/Sanctions screening
- **FINAL_DECISION**: Approval/Rejection

---

## Status Indicators

### Success ✓
- **Color**: Green
- **Meaning**: Step completed successfully
- **Icon**: Checkmark
- **Badge**: Green "SUCCESS"

### Failure ✗
- **Color**: Red
- **Meaning**: Step failed or rejected
- **Icon**: X mark
- **Badge**: Red "FAILURE"

### Pending ⏳
- **Color**: Gray
- **Meaning**: Step not yet completed
- **Icon**: Clock
- **Badge**: Gray "PENDING"

---

## Reading the Timeline

### Example Timeline

```
[Green ✓]────────────[Green ✓]────────────[Red ✗]
   VIEW                 START                FINISH
   8.2s                 279ms                0ms

Total: 8.5s
```

**Interpretation**:
- User viewed scanning screen for 8.2 seconds
- Scanning took 279 milliseconds
- Verification failed immediately (0ms) due to background check match
- **Total time**: 8.5 seconds from start to finish

---

## Event List Details

### Example Event Card

```
┌─────────────────────────────────────────────────────────┐
│ ● START SCAN                              +8.23s SUCCESS │
│   🕐 5:00:56 PM  •  ENROLLMENT  •  GENERIC_ID          ▼ │
└─────────────────────────────────────────────────────────┘
```

**Expanded View**:
```
┌─────────────────────────────────────────────────────────┐
│ ● START SCAN                              +8.23s SUCCESS │
│   🕐 5:00:56 PM  •  ENROLLMENT  •  GENERIC_ID          ▲ │
│                                                           │
│   Score: 95%                  Confidence: 90%            │
│   Quality: 87%                Method: NFC                │
│   Device: iPhone 14 Pro                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Data Sources

The Performance Journey automatically parses data from:

### 1. Analytics Property
If account has `analytics` array:
```json
{
  "analytics": [
    {
      "name": "VIEW",
      "type": "SCAN",
      "status": "success",
      "duration": 8200,
      "timestamp": "2024-01-17T17:00:47Z",
      "details": { ... }
    }
  ]
}
```

### 2. Verification Steps Property
If account has `verification_steps` array:
```json
{
  "verification_steps": [
    {
      "step_name": "Face Match",
      "step_type": "VERIFICATION",
      "status": "passed",
      "duration_ms": 350,
      "details": {
        "score": 0.95,
        "confidence": 0.89
      }
    }
  ]
}
```

### 3. Synthetic Events
If no analytics available, creates events from:
- `created_at` timestamp
- `verification_status`
- `aml_status`

**Example Synthetic Flow**:
- VIEW at creation time
- START at +5 seconds
- FINISH at +8.5 seconds with status based on AML

---

## Common Patterns

### Fast Verification (< 10 seconds)
```
VIEW (7s) → START (200ms) → FINISH (100ms)
✓ All green
Total: 7.3s
```
**Meaning**: Quick, successful verification with good quality documents

### Slow Verification (> 15 seconds)
```
VIEW (12s) → START (3s) → FINISH (500ms)
✓ All green
Total: 15.5s
```
**Meaning**: User took time to position document, or multiple retries needed

### Failed Verification
```
VIEW (8s) → START (300ms) → FINISH (0ms)
✓ Green    ✓ Green         ✗ Red
Total: 8.3s
```
**Meaning**: Scanning successful but verification failed (background check match, quality issues, etc.)

---

## Troubleshooting

### No Performance Journey Showing
**Cause**: Account has no analytics data

**Solution**:
- Ensure mobile app SDK has analytics enabled
- Check that SDK version supports analytics
- Verify webhook is receiving and storing analytics data

### Empty Timeline
**Cause**: Missing timestamp data

**Solution**:
- Synthetic events will be created from `created_at`
- Verify account has `created_at` field
- Check console for errors

### Events Not Expanding
**Cause**: No detail data available

**Solution**:
- Some events may not have details
- This is normal for simple events like VIEW/START
- Verification events (face match, liveness) should have details

---

## Customization

### Adding Custom Events

If your SDK captures custom events, add them to the analytics array:

```javascript
{
  "name": "CUSTOM_CHECK",
  "type": "VERIFICATION",
  "status": "success",
  "duration": 1500,
  "timestamp": "2024-01-17T17:00:55Z",
  "id": "CUSTOM_ID",
  "details": {
    "custom_field": "custom_value",
    "score": 0.92
  }
}
```

The Performance Journey will automatically:
- Display the event in the timeline
- Show appropriate icon based on name
- Display details when expanded

### Custom Event Icons

The component maps event names to Material Icons:

| Event Name Pattern | Icon |
|-------------------|------|
| view | visibility |
| scan | document_scanner |
| start | play_circle |
| finish | check_circle |
| face_match | face |
| liveness | sensors |
| nfc_reading | nfc |
| ocr | text_fields |
| document_quality | high_quality |
| background_check | shield |
| verification | verified_user |
| submit | send |
| error | error |

---

## Best Practices

### 1. Enable SDK Analytics
Always enable analytics in mobile SDK:

```dart
// Flutter
analyticsConfig: AnalyticsConfig(
  trackScreenViews: true,
  trackUserActions: true,
  trackErrors: true,
)
```

```kotlin
// Android
.enableAnalytics(true)
.setAnalyticsConfig(
  AnalyticsConfig.Builder()
    .trackScreenViews(true)
    .trackUserActions(true)
    .build()
)
```

### 2. Include Timing Data
Ensure each event has:
- `timestamp`: Exact time of event
- `duration`: Time since previous event (optional, will be calculated)
- `status`: success/failure/pending

### 3. Add Contextual Details
Include relevant details for troubleshooting:
- Scores for verification steps
- Error messages for failures
- Device information
- Method used (NFC, OCR, etc.)

### 4. Monitor Performance
Use the Performance Journey to:
- Identify slow verification flows
- Find common failure points
- Optimize user experience
- Track success rates by step

---

## API Integration

### Storing Analytics Data

When receiving SDK results, store analytics in account:

```javascript
// In sdk-verification-jws.js
await supabaseAdmin
  .from('accounts')
  .update({
    analytics: sdkResult.analytics,
    verification_steps: sdkResult.verification_steps
  })
  .eq('id', accountId);
```

### Retrieving for Display

The component automatically retrieves data when:
- Viewing account details
- Viewing alert details

No additional API calls needed!

---

## Performance Metrics

### What to Track

1. **Total Duration**: Overall time from start to finish
   - Target: < 15 seconds
   - Good: 8-12 seconds
   - Excellent: < 8 seconds

2. **Step Duration**: Individual step times
   - VIEW: 5-10 seconds (user dependent)
   - START: 200-500ms (capture + processing)
   - FINISH: 0-200ms (decision making)

3. **Success Rate**: % of successful completions
   - Target: > 90%
   - Monitor failure points

4. **Retry Rate**: How often users retry
   - High VIEW duration = multiple retries
   - Target: < 20% retry rate

---

## Examples

### Example 1: Perfect Flow
```
VIEW (7.5s) ✓ → START (250ms) ✓ → FINISH (50ms) ✓
NFC verified | Face match 96% | Background check clear
Total: 7.8s
Result: AML Clear, Account Approved
```

### Example 2: Quality Issues
```
VIEW (15s) ✓ → START (450ms) ✓ → FINISH (200ms) ✗
Multiple retries | Document quality 68% | Failed threshold
Total: 15.65s
Result: Rejected - Poor Document Quality
```

### Example 3: Background Check Match
```
VIEW (8s) ✓ → START (280ms) ✓ → FINISH (0ms) ✗
Perfect quality | All checks passed | PEP match found
Total: 8.28s
Result: AML Match Found - Case Created
```

---

## Support & Feedback

For issues or feature requests related to Performance Journey:

1. Check console for errors: `F12 → Console`
2. Verify data structure matches expected format
3. Test with sample data
4. Report issues with:
   - Account ID
   - Expected vs actual behavior
   - Console errors
   - Screenshots

---

## Future Enhancements

Planned features:
- [ ] Export timeline as image
- [ ] Compare multiple verifications
- [ ] Statistical analysis dashboard
- [ ] Real-time streaming (WebSocket)
- [ ] Custom event colors/icons
- [ ] Filtering by event type
- [ ] Search within events
- [ ] Performance benchmarking

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
**Component**: Performance Journey Visualization
**Status**: Production Ready ✅
