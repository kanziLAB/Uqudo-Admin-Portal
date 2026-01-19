# Uqudo SDK Analytics Integration Guide

## Overview

This guide explains how to enable analytics in the Uqudo SDK and submit trace events to the Admin Portal verification endpoint. Analytics provide detailed insights into user verification journeys, including timing, success rates, friction points, and environment issues.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Android SDK Integration](#android-sdk-integration)
4. [iOS SDK Integration](#ios-sdk-integration)
5. [Flutter SDK Integration](#flutter-sdk-integration)
6. [Web SDK Integration](#web-sdk-integration)
7. [Verification Endpoint](#verification-endpoint)
8. [Trace Event Structure](#trace-event-structure)
9. [Testing & Debugging](#testing--debugging)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before integrating analytics, ensure you have:

- Uqudo SDK version 3.0+ installed
- Valid Uqudo API credentials (Client ID & Secret)
- Access to the Admin Portal
- Your **Tenant ID** from the Admin Portal

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Mobile/Web    │     │   Your Backend       │     │  Admin Portal   │
│   Application   │────>│   (Optional Proxy)   │────>│  Verification   │
│                 │     │                      │     │  Endpoint       │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
        │                                                    │
        │  SDK Trace Events + JWS Token                      │
        └────────────────────────────────────────────────────┘
                              Direct Submission
```

**Two Integration Options:**

1. **Direct Submission**: SDK sends JWS token directly to Admin Portal endpoint
2. **Backend Proxy**: SDK sends to your backend, which forwards to Admin Portal

---

## Android SDK Integration

### Step 1: Add SDK Dependency

```kotlin
// build.gradle (app level)
dependencies {
    implementation 'com.uqudo:sdk:3.x.x'
}
```

### Step 2: Initialize SDK with Analytics Enabled

```kotlin
import com.uqudo.sdk.UqudoSDK
import com.uqudo.sdk.config.UqudoConfig
import com.uqudo.sdk.config.EnrollmentConfig
import com.uqudo.sdk.config.AnalyticsConfig

class MainActivity : AppCompatActivity() {

    private lateinit var uqudoSDK: UqudoSDK

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize SDK
        uqudoSDK = UqudoSDK.init(this)

        // Configure with analytics enabled
        val config = UqudoConfig.Builder()
            .setClientId("YOUR_CLIENT_ID")
            .setClientSecret("YOUR_CLIENT_SECRET")
            .setEnableAnalytics(true)           // Required: Enable analytics
            .setIncludeTraceInJWS(true)         // Required: Include trace in token
            .build()

        uqudoSDK.configure(config)
    }
}
```

### Step 3: Configure Enrollment with Webhook

```kotlin
fun startEnrollment() {
    val enrollmentConfig = EnrollmentConfig.Builder()
        // Document scanning configuration
        .setDocumentType(DocumentType.UAE_ID)
        .enableFacialRecognition(true)
        .enableNFCReading(true)

        // Analytics configuration
        .setAnalyticsConfig(
            AnalyticsConfig.Builder()
                .setTrackScreenViews(true)
                .setTrackUserActions(true)
                .setTrackErrors(true)
                .setTrackEnvironment(true)
                .build()
        )

        // Webhook configuration - Direct submission to Admin Portal
        .setWebhookUrl("https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws")
        .addHeader("X-Tenant-ID", "YOUR_TENANT_ID")  // Required!
        .addHeader("Content-Type", "application/json")

        .build()

    uqudoSDK.enroll(enrollmentConfig, object : EnrollmentCallback {
        override fun onSuccess(result: EnrollmentResult) {
            // JWS token is automatically sent to webhook
            Log.d("Uqudo", "Enrollment successful: ${result.sessionId}")

            // Optional: Handle result in your app
            handleEnrollmentSuccess(result)
        }

        override fun onError(error: UqudoError) {
            Log.e("Uqudo", "Enrollment failed: ${error.message}")
            handleEnrollmentError(error)
        }

        override fun onCancelled() {
            Log.w("Uqudo", "Enrollment cancelled by user")
        }
    })
}
```

### Step 4: Manual Submission (Alternative)

If you prefer to handle submission manually:

```kotlin
fun startEnrollmentManual() {
    val enrollmentConfig = EnrollmentConfig.Builder()
        .setDocumentType(DocumentType.UAE_ID)
        .enableFacialRecognition(true)
        .setEnableAnalytics(true)
        .setIncludeTraceInJWS(true)
        // Don't set webhook - handle manually
        .build()

    uqudoSDK.enroll(enrollmentConfig, object : EnrollmentCallback {
        override fun onSuccess(result: EnrollmentResult) {
            // Get JWS token and trace events
            val jwsToken = result.jwsToken
            val traceEvents = result.traceEvents  // List of trace events

            // Submit manually to your backend or Admin Portal
            submitToAdminPortal(jwsToken, traceEvents)
        }

        override fun onError(error: UqudoError) {
            // Handle error
        }

        override fun onCancelled() {
            // Handle cancellation
        }
    })
}

private fun submitToAdminPortal(jwsToken: String, traceEvents: List<TraceEvent>) {
    val client = OkHttpClient()

    val payload = JSONObject().apply {
        put("token", jwsToken)
        put("traceEvents", JSONArray(traceEvents.map { it.toJson() }))
    }

    val request = Request.Builder()
        .url("https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws")
        .post(payload.toString().toRequestBody("application/json".toMediaType()))
        .addHeader("X-Tenant-ID", "YOUR_TENANT_ID")
        .addHeader("Content-Type", "application/json")
        .build()

    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            if (response.isSuccessful) {
                Log.d("Uqudo", "Submitted successfully: ${response.body?.string()}")
            } else {
                Log.e("Uqudo", "Submission failed: ${response.code}")
            }
        }

        override fun onFailure(call: Call, e: IOException) {
            Log.e("Uqudo", "Network error: ${e.message}")
        }
    })
}
```

---

## iOS SDK Integration

### Step 1: Add SDK via CocoaPods or SPM

```ruby
# Podfile
pod 'UqudoSDK', '~> 3.0'
```

### Step 2: Initialize SDK with Analytics

```swift
import UqudoSDK

class ViewController: UIViewController {

    private var uqudoSDK: UqudoSDK!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Initialize SDK
        let config = UqudoConfig()
        config.clientId = "YOUR_CLIENT_ID"
        config.clientSecret = "YOUR_CLIENT_SECRET"
        config.enableAnalytics = true        // Required: Enable analytics
        config.includeTraceInJWS = true      // Required: Include trace in token

        uqudoSDK = UqudoSDK(config: config)
    }
}
```

### Step 3: Configure Enrollment with Webhook

```swift
func startEnrollment() {
    let enrollmentConfig = EnrollmentConfig()

    // Document configuration
    enrollmentConfig.documentType = .uaeId
    enrollmentConfig.enableFacialRecognition = true
    enrollmentConfig.enableNFCReading = true

    // Analytics configuration
    let analyticsConfig = AnalyticsConfig()
    analyticsConfig.trackScreenViews = true
    analyticsConfig.trackUserActions = true
    analyticsConfig.trackErrors = true
    analyticsConfig.trackEnvironment = true
    enrollmentConfig.analyticsConfig = analyticsConfig

    // Webhook configuration
    enrollmentConfig.webhookUrl = "https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws"
    enrollmentConfig.webhookHeaders = [
        "X-Tenant-ID": "YOUR_TENANT_ID",
        "Content-Type": "application/json"
    ]

    uqudoSDK.enroll(config: enrollmentConfig) { result in
        switch result {
        case .success(let enrollmentResult):
            print("Enrollment successful: \(enrollmentResult.sessionId)")
            // JWS token is automatically sent to webhook

        case .failure(let error):
            print("Enrollment failed: \(error.localizedDescription)")

        case .cancelled:
            print("Enrollment cancelled by user")
        }
    }
}
```

### Step 4: Manual Submission (Alternative)

```swift
func startEnrollmentManual() {
    let enrollmentConfig = EnrollmentConfig()
    enrollmentConfig.documentType = .uaeId
    enrollmentConfig.enableAnalytics = true
    enrollmentConfig.includeTraceInJWS = true
    // Don't set webhookUrl - handle manually

    uqudoSDK.enroll(config: enrollmentConfig) { [weak self] result in
        switch result {
        case .success(let enrollmentResult):
            // Get JWS token and trace events
            let jwsToken = enrollmentResult.jwsToken
            let traceEvents = enrollmentResult.traceEvents

            // Submit manually
            self?.submitToAdminPortal(token: jwsToken, events: traceEvents)

        case .failure(let error):
            print("Error: \(error)")

        case .cancelled:
            print("Cancelled")
        }
    }
}

private func submitToAdminPortal(token: String, events: [TraceEvent]) {
    guard let url = URL(string: "https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws") else { return }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("YOUR_TENANT_ID", forHTTPHeaderField: "X-Tenant-ID")

    let payload: [String: Any] = [
        "token": token,
        "traceEvents": events.map { $0.toDictionary() }
    ]

    request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

    URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            print("Error: \(error)")
            return
        }

        if let httpResponse = response as? HTTPURLResponse {
            print("Response status: \(httpResponse.statusCode)")
        }
    }.resume()
}
```

---

## Flutter SDK Integration

### Step 1: Add SDK Dependency

```yaml
# pubspec.yaml
dependencies:
  uqudo_sdk: ^3.0.0
```

### Step 2: Initialize and Configure

```dart
import 'package:uqudo_sdk/uqudo_sdk.dart';

class EnrollmentService {
  late UqudoSDK _sdk;

  Future<void> initialize() async {
    _sdk = UqudoSDK();

    await _sdk.configure(
      UqudoConfig(
        clientId: 'YOUR_CLIENT_ID',
        clientSecret: 'YOUR_CLIENT_SECRET',
        enableAnalytics: true,        // Required: Enable analytics
        includeTraceInJWS: true,      // Required: Include trace in token
      ),
    );
  }

  Future<void> startEnrollment() async {
    final config = EnrollmentConfig(
      // Document configuration
      documentType: DocumentType.uaeId,
      enableFacialRecognition: true,
      enableNFCReading: true,

      // Analytics configuration
      analyticsConfig: AnalyticsConfig(
        trackScreenViews: true,
        trackUserActions: true,
        trackErrors: true,
        trackEnvironment: true,
      ),

      // Webhook configuration
      webhookUrl: 'https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws',
      webhookHeaders: {
        'X-Tenant-ID': 'YOUR_TENANT_ID',
        'Content-Type': 'application/json',
      },
    );

    try {
      final result = await _sdk.enroll(config);

      print('Enrollment successful: ${result.sessionId}');
      // JWS token is automatically sent to webhook

    } on UqudoException catch (e) {
      print('Enrollment failed: ${e.message}');
    } on UqudoCancelledException {
      print('Enrollment cancelled');
    }
  }
}
```

### Step 3: Manual Submission (Alternative)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> startEnrollmentManual() async {
  final config = EnrollmentConfig(
    documentType: DocumentType.uaeId,
    enableAnalytics: true,
    includeTraceInJWS: true,
    // Don't set webhookUrl - handle manually
  );

  try {
    final result = await _sdk.enroll(config);

    // Get JWS token and trace events
    final jwsToken = result.jwsToken;
    final traceEvents = result.traceEvents;

    // Submit manually
    await submitToAdminPortal(jwsToken, traceEvents);

  } on UqudoException catch (e) {
    print('Error: ${e.message}');
  }
}

Future<void> submitToAdminPortal(String token, List<TraceEvent> events) async {
  final url = Uri.parse(
    'https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws'
  );

  final response = await http.post(
    url,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'YOUR_TENANT_ID',
    },
    body: jsonEncode({
      'token': token,
      'traceEvents': events.map((e) => e.toJson()).toList(),
    }),
  );

  if (response.statusCode == 200) {
    print('Submitted successfully: ${response.body}');
  } else {
    print('Submission failed: ${response.statusCode}');
  }
}
```

---

## Web SDK Integration

### Step 1: Include SDK

```html
<!-- Include Uqudo Web SDK -->
<script src="https://sdk.uqudo.com/web/v3/uqudo-sdk.min.js"></script>
```

### Step 2: Initialize and Configure

```javascript
// Initialize SDK
const uqudoSDK = new UqudoSDK({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  enableAnalytics: true,        // Required: Enable analytics
  includeTraceInJWS: true,      // Required: Include trace in token
});

// Start enrollment
async function startEnrollment() {
  try {
    const result = await uqudoSDK.enroll({
      // Document configuration
      documentType: 'UAE_ID',
      enableFacialRecognition: true,

      // Analytics configuration
      analytics: {
        trackScreenViews: true,
        trackUserActions: true,
        trackErrors: true,
        trackEnvironment: true,
      },

      // Webhook configuration
      webhookUrl: 'https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws',
      webhookHeaders: {
        'X-Tenant-ID': 'YOUR_TENANT_ID',
      },
    });

    console.log('Enrollment successful:', result.sessionId);
    // JWS token is automatically sent to webhook

  } catch (error) {
    if (error.code === 'CANCELLED') {
      console.log('Enrollment cancelled by user');
    } else {
      console.error('Enrollment failed:', error.message);
    }
  }
}
```

### Step 3: Manual Submission with Trace Events

```javascript
async function startEnrollmentManual() {
  try {
    const result = await uqudoSDK.enroll({
      documentType: 'UAE_ID',
      enableFacialRecognition: true,
      enableAnalytics: true,
      includeTraceInJWS: true,
      // Don't set webhookUrl - handle manually
    });

    // Get JWS token and trace events
    const jwsToken = result.jwsToken;
    const traceEvents = result.traceEvents;

    // Submit manually
    await submitToAdminPortal(jwsToken, traceEvents);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function submitToAdminPortal(token, traceEvents) {
  const response = await fetch(
    'https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'YOUR_TENANT_ID',
      },
      body: JSON.stringify({
        token: token,
        traceEvents: traceEvents,
      }),
    }
  );

  if (response.ok) {
    const data = await response.json();
    console.log('Submitted successfully:', data);
    return data;
  } else {
    throw new Error(`Submission failed: ${response.status}`);
  }
}
```

---

## Verification Endpoint

### Endpoint Details

| Property | Value |
|----------|-------|
| **URL** | `https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

### Required Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-Tenant-ID` | Your tenant UUID from Admin Portal | `00000000-0000-0000-0000-000000000001` |
| `Content-Type` | Must be `application/json` | `application/json` |

### Request Body

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "traceEvents": [
    {
      "name": "SCAN",
      "type": "START",
      "status": "SUCCESS",
      "timestamp": "2026-01-19T14:52:32.000Z",
      "duration": 4500,
      "metadata": {
        "documentType": "UAE_ID"
      }
    }
  ],
  "industry": "Banking"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | JWS token from SDK enrollment result |
| `traceEvents` | array | No | Array of trace event objects (if not embedded in token) |
| `industry` | string | No | Industry context (e.g., "Banking", "Insurance") |

### Response

**Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "verification": {
      "status": "approved",
      "issues": [],
      "warnings": [],
      "passed_checks": true,
      "nfc_verified": true,
      "passive_authentication": true
    },
    "backgroundCheck": {
      "match": true,
      "case_created": false,
      "alert_created": false
    },
    "account": {
      "id": "f158da33-7cef-4a4d-a324-ab64a85f7615",
      "full_name": "JOHN DOE",
      "id_number": "784198520387683",
      "date_of_birth": "1985-06-08",
      "nationality": "ARE",
      "document_type": "UAE_ID"
    }
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Missing or invalid token |
| 401 | Unauthorized - Invalid or missing tenant ID |
| 500 | Server Error - Processing failed |

---

## Trace Event Structure

### Event Types

| Event Name | Description |
|------------|-------------|
| `SDK_INIT` | SDK initialization |
| `SCAN` | Document scanning |
| `READ` | NFC chip reading |
| `FACE` | Facial recognition |
| `BACKGROUND_CHECK` | AML/PEP screening |
| `ENROLLMENT` | Final enrollment step |

### Event Statuses

| Status | Description |
|--------|-------------|
| `VIEW` | Step was displayed to user |
| `START` | Step processing started |
| `IN_PROGRESS` | Step is in progress |
| `COMPLETE` | Step completed successfully |
| `FAILURE` | Step failed |
| `FINISH` | Final completion |

### Event Object Structure

```typescript
interface TraceEvent {
  name: string;           // Event name (e.g., "SCAN", "FACE")
  type: string;           // Event type (e.g., "VIEW", "START", "COMPLETE")
  status: string;         // Status (e.g., "SUCCESS", "FAILURE")
  timestamp: string;      // ISO 8601 timestamp
  duration?: number;      // Duration in milliseconds
  id?: string;            // Additional identifier (e.g., document type)
  metadata?: {
    documentType?: string;
    errorCode?: string;
    errorMessage?: string;
    [key: string]: any;
  };
}
```

### Example Trace Events Sequence

```json
[
  {"name": "SDK_INIT", "type": "VIEW", "timestamp": "2026-01-19T14:52:27.000Z"},
  {"name": "SCAN", "type": "VIEW", "timestamp": "2026-01-19T14:52:32.000Z"},
  {"name": "SCAN", "type": "START", "timestamp": "2026-01-19T14:52:32.500Z"},
  {"name": "SCAN", "type": "IN_PROGRESS", "status": "FAILURE", "id": "BLUR_DETECTED", "timestamp": "2026-01-19T14:52:35.000Z"},
  {"name": "SCAN", "type": "IN_PROGRESS", "status": "SUCCESS", "id": "FRONT_PROCESSED", "timestamp": "2026-01-19T14:52:36.000Z"},
  {"name": "SCAN", "type": "IN_PROGRESS", "status": "SUCCESS", "id": "BACK_PROCESSED", "timestamp": "2026-01-19T14:52:39.000Z"},
  {"name": "SCAN", "type": "COMPLETE", "timestamp": "2026-01-19T14:52:39.500Z", "duration": 7000},
  {"name": "READ", "type": "VIEW", "timestamp": "2026-01-19T14:52:41.000Z"},
  {"name": "READ", "type": "START", "timestamp": "2026-01-19T14:52:44.000Z"},
  {"name": "READ", "type": "COMPLETE", "timestamp": "2026-01-19T14:52:46.000Z", "duration": 2000},
  {"name": "FACE", "type": "VIEW", "timestamp": "2026-01-19T14:52:46.500Z"},
  {"name": "FACE", "type": "START", "timestamp": "2026-01-19T14:52:49.000Z"},
  {"name": "FACE", "type": "COMPLETE", "timestamp": "2026-01-19T14:52:50.000Z", "duration": 1000},
  {"name": "BACKGROUND_CHECK", "type": "VIEW", "timestamp": "2026-01-19T14:52:50.500Z"},
  {"name": "BACKGROUND_CHECK", "type": "START", "timestamp": "2026-01-19T14:52:51.000Z"},
  {"name": "BACKGROUND_CHECK", "type": "COMPLETE", "timestamp": "2026-01-19T14:52:52.000Z", "duration": 1000},
  {"name": "ENROLLMENT", "type": "FINISH", "timestamp": "2026-01-19T14:52:53.000Z"}
]
```

---

## Testing & Debugging

### 1. Verify SDK Configuration

```kotlin
// Android - Log configuration
Log.d("Uqudo", "Analytics enabled: ${config.enableAnalytics}")
Log.d("Uqudo", "Include trace in JWS: ${config.includeTraceInJWS}")
Log.d("Uqudo", "Webhook URL: ${config.webhookUrl}")
Log.d("Uqudo", "Tenant ID: ${config.webhookHeaders["X-Tenant-ID"]}")
```

### 2. Log Trace Events

```kotlin
// Android - Log trace events before submission
result.traceEvents.forEach { event ->
    Log.d("Uqudo", "Event: ${event.name} | Type: ${event.type} | Status: ${event.status}")
}
```

### 3. Test Endpoint Connectivity

```bash
# Test endpoint with curl
curl -X POST https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -d '{"token": "test"}' \
  -v
```

### 4. Check Admin Portal

After successful submission:
1. Log into Admin Portal
2. Navigate to **Analytics** page
3. Search by Session ID or Account ID
4. Verify trace events are displayed in UX Analysis tab

---

## Troubleshooting

### Common Issues

#### 1. "Session not appearing in Admin Portal"

**Cause:** Tenant ID mismatch

**Solution:**
- Verify `X-Tenant-ID` header matches your Admin Portal user's tenant
- Get your tenant ID from browser console: `JSON.parse(localStorage.getItem('user_data')).tenant_id`

#### 2. "405 Method Not Allowed"

**Cause:** Using wrong HTTP method

**Solution:**
- Ensure you're using `POST` method
- Check the endpoint URL is correct

#### 3. "401 Unauthorized"

**Cause:** Missing or invalid tenant ID

**Solution:**
- Add `X-Tenant-ID` header to request
- Verify tenant ID is a valid UUID

#### 4. "400 Bad Request - Missing token"

**Cause:** Token not included in request body

**Solution:**
- Ensure `token` field is present in JSON body
- Verify JWS token is a valid string

#### 5. "Analytics not showing trace events"

**Cause:** Trace events not enabled or not included

**Solution:**
- Set `enableAnalytics = true`
- Set `includeTraceInJWS = true`
- If submitting manually, include `traceEvents` array in request body

#### 6. "Duration showing as 0s"

**Cause:** Trace events missing timestamp or duration fields

**Solution:**
- Ensure SDK version supports analytics (3.0+)
- Verify trace events have proper timestamp format
- Check `duration` field is in milliseconds

### Debug Checklist

- [ ] SDK version is 3.0 or higher
- [ ] `enableAnalytics` is set to `true`
- [ ] `includeTraceInJWS` is set to `true`
- [ ] Webhook URL is correct
- [ ] `X-Tenant-ID` header is included
- [ ] `Content-Type` is `application/json`
- [ ] Network connectivity to endpoint
- [ ] JWS token is valid and not expired

---

## Quick Reference

### Minimum Required Configuration

```kotlin
// Android
val config = UqudoConfig.Builder()
    .setClientId("YOUR_CLIENT_ID")
    .setClientSecret("YOUR_CLIENT_SECRET")
    .setEnableAnalytics(true)         // Required
    .setIncludeTraceInJWS(true)       // Required
    .build()

val enrollmentConfig = EnrollmentConfig.Builder()
    .setWebhookUrl("https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws")
    .addHeader("X-Tenant-ID", "YOUR_TENANT_ID")  // Required
    .build()
```

```swift
// iOS
config.enableAnalytics = true         // Required
config.includeTraceInJWS = true       // Required

enrollmentConfig.webhookUrl = "https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws"
enrollmentConfig.webhookHeaders = ["X-Tenant-ID": "YOUR_TENANT_ID"]  // Required
```

```dart
// Flutter
UqudoConfig(
  enableAnalytics: true,              // Required
  includeTraceInJWS: true,            // Required
)

EnrollmentConfig(
  webhookUrl: 'https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws',
  webhookHeaders: {'X-Tenant-ID': 'YOUR_TENANT_ID'},  // Required
)
```

```javascript
// Web
const sdk = new UqudoSDK({
  enableAnalytics: true,              // Required
  includeTraceInJWS: true,            // Required
});

await sdk.enroll({
  webhookUrl: 'https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws',
  webhookHeaders: { 'X-Tenant-ID': 'YOUR_TENANT_ID' },  // Required
});
```

---

## Support

For additional support:
- SDK Documentation: https://docs.uqudo.com
- Contact: support@uqudo.com
