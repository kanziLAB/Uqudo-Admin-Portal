# Uqudo SDK Mobile Setup Guide
## Background Checks & Analytics Configuration

This guide shows how to enable background checks and analytics in your Uqudo SDK mobile integration.

---

## Table of Contents
1. [Flutter Integration](#flutter-integration)
2. [Android (Kotlin) Integration](#android-kotlin-integration)
3. [iOS (Swift) Integration](#ios-swift-integration)
4. [Testing the Integration](#testing-the-integration)

---

## Flutter Integration

### Prerequisites
```yaml
# pubspec.yaml
dependencies:
  uqudo_sdk: ^latest_version
```

### Complete Enrollment Flow with Background Checks

```dart
import 'package:uqudo_sdk/uqudo_sdk.dart';

class UqudoKYCService {
  final UqudoSDK _sdk = UqudoSDK();

  Future<void> initializeSDK() async {
    await _sdk.init(
      apiKey: 'YOUR_API_KEY',
      apiSecret: 'YOUR_API_SECRET',
      environment: Environment.production, // or Environment.sandbox
    );
  }

  Future<UqudoResult> performKYCEnrollment() async {
    // Configure enrollment with background checks enabled
    final config = EnrollmentConfig(
      // Document scanning
      documentTypes: [
        DocumentType.passport,
        DocumentType.emiratesId,
        DocumentType.drivingLicense,
      ],

      // Enable NFC reading for chip-enabled documents
      enableNFC: true,

      // Face verification
      enableFaceMatch: true,
      enableLiveness: true,

      // CRITICAL: Enable background checks
      enableBackgroundCheck: true,

      // Background check configuration
      backgroundCheckConfig: BackgroundCheckConfig(
        // Enable PEP (Politically Exposed Persons) screening
        enablePEPScreening: true,

        // Enable sanctions list screening
        enableSanctionsScreening: true,

        // Enable adverse media screening
        enableAdverseMediaScreening: true,

        // Monitor for ongoing changes
        enableMonitoring: true,

        // Webhook URL - IMPORTANT: Use your actual Vercel URL
        webhookUrl: 'https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws',

        // Include tenant ID in headers
        headers: {
          'X-Tenant-ID': 'YOUR_TENANT_ID', // Get from admin portal
          'Content-Type': 'application/json',
        },
      ),

      // CRITICAL: Enable analytics
      enableAnalytics: true,

      // Analytics configuration
      analyticsConfig: AnalyticsConfig(
        // Track all events
        trackScreenViews: true,
        trackUserActions: true,
        trackErrors: true,

        // Send analytics to your backend
        analyticsEndpoint: 'https://uqudo-admin-portal.vercel.app/api/analytics',

        // Custom event properties
        customProperties: {
          'app_version': '1.0.0',
          'platform': 'flutter',
          'enrollment_source': 'mobile_app',
        },
      ),
    );

    try {
      final result = await _sdk.enroll(config);

      // Handle result
      if (result.isSuccess) {
        print('✅ Enrollment successful');
        print('JWS Token: ${result.jwsToken}');

        // The SDK automatically sends results to your webhook
        // Check admin portal for:
        // - Account creation
        // - Background check matches (if any)
        // - AML cases (if matches found)

        return result;
      } else {
        print('❌ Enrollment failed: ${result.error}');
        throw Exception(result.error);
      }
    } catch (e) {
      print('❌ SDK Error: $e');
      rethrow;
    }
  }

  // Optional: Manually send result to webhook (if needed)
  Future<void> sendResultToWebhook(UqudoResult result) async {
    final response = await http.post(
      Uri.parse('https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws'),
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'YOUR_TENANT_ID',
      },
      body: jsonEncode({
        'token': result.jwsToken,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('✅ Result sent to portal');
      print('Account ID: ${data['data']['account']['account_id']}');
      print('AML Status: ${data['data']['account']['aml_status']}');
    } else {
      print('❌ Failed to send result: ${response.body}');
    }
  }
}
```

### Usage Example

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final kycService = UqudoKYCService();

  // Initialize SDK
  await kycService.initializeSDK();

  // Perform enrollment
  final result = await kycService.performKYCEnrollment();

  if (result.isSuccess) {
    // Show success screen
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SuccessScreen(result: result),
      ),
    );
  }
}
```

---

## Android (Kotlin) Integration

### Gradle Setup

```gradle
// app/build.gradle
dependencies {
    implementation 'com.uqudo:uqudo-sdk:latest_version'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0' // For webhook calls
}
```

### Complete Implementation

```kotlin
package com.yourapp.kyc

import android.content.Context
import com.uqudo.sdk.UqudoSDK
import com.uqudo.sdk.core.UqudoResult
import com.uqudo.sdk.enrollment.EnrollmentBuilder
import com.uqudo.sdk.backgroundcheck.BackgroundCheckConfig
import com.uqudo.sdk.analytics.AnalyticsConfig
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class UqudoKYCManager(private val context: Context) {

    private val sdk = UqudoSDK.getInstance()

    // Your Vercel deployment URL
    private val WEBHOOK_URL = "https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws"
    private val TENANT_ID = "YOUR_TENANT_ID" // Get from admin portal

    fun initializeSDK() {
        sdk.init(
            context = context,
            apiKey = "YOUR_API_KEY",
            apiSecret = "YOUR_API_SECRET",
            environment = UqudoSDK.Environment.PRODUCTION
        )
    }

    suspend fun performKYCEnrollment(): UqudoResult {
        val enrollmentConfig = EnrollmentBuilder()
            // Document types
            .setDocumentTypes(
                listOf(
                    DocumentType.PASSPORT,
                    DocumentType.EMIRATES_ID,
                    DocumentType.DRIVING_LICENSE
                )
            )

            // Enable NFC reading
            .enableNFC(true)

            // Face verification
            .enableFaceMatch(true)
            .enableLiveness(true)

            // CRITICAL: Enable background checks
            .enableBackgroundCheck(true)
            .setBackgroundCheckConfig(
                BackgroundCheckConfig.Builder()
                    // Enable screening types
                    .enablePEPScreening(true)
                    .enableSanctionsScreening(true)
                    .enableAdverseMediaScreening(true)
                    .enableMonitoring(true)

                    // Webhook configuration
                    .setWebhookUrl(WEBHOOK_URL)
                    .addHeader("X-Tenant-ID", TENANT_ID)
                    .addHeader("Content-Type", "application/json")
                    .build()
            )

            // CRITICAL: Enable analytics
            .enableAnalytics(true)
            .setAnalyticsConfig(
                AnalyticsConfig.Builder()
                    .trackScreenViews(true)
                    .trackUserActions(true)
                    .trackErrors(true)
                    .setAnalyticsEndpoint("$WEBHOOK_URL/analytics")
                    .addCustomProperty("app_version", "1.0.0")
                    .addCustomProperty("platform", "android")
                    .build()
            )
            .build()

        val result = sdk.enroll(enrollmentConfig)

        when (result) {
            is UqudoResult.Success -> {
                Log.d("Uqudo", "✅ Enrollment successful")
                Log.d("Uqudo", "JWS Token: ${result.jwsToken}")

                // SDK automatically sends to webhook
                // Optionally verify receipt
                verifyWebhookReceipt(result.jwsToken)

                return result
            }
            is UqudoResult.Error -> {
                Log.e("Uqudo", "❌ Enrollment failed: ${result.message}")
                throw Exception(result.message)
            }
        }
    }

    private fun verifyWebhookReceipt(jwsToken: String) {
        val client = OkHttpClient()

        val json = JSONObject().apply {
            put("token", jwsToken)
        }

        val body = json.toString().toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(WEBHOOK_URL)
            .post(body)
            .addHeader("X-Tenant-ID", TENANT_ID)
            .addHeader("Content-Type", "application/json")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("Uqudo", "❌ Webhook failed: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        val responseData = JSONObject(it.body?.string() ?: "{}")
                        Log.d("Uqudo", "✅ Webhook received:")
                        Log.d("Uqudo", "Account ID: ${responseData.optJSONObject("data")?.optJSONObject("account")?.optString("account_id")}")
                        Log.d("Uqudo", "AML Status: ${responseData.optJSONObject("data")?.optJSONObject("account")?.optString("aml_status")}")
                    } else {
                        Log.e("Uqudo", "❌ Webhook error: ${it.code} - ${it.body?.string()}")
                    }
                }
            }
        })
    }
}
```

### Activity Usage

```kotlin
class KYCActivity : AppCompatActivity() {

    private lateinit var kycManager: UqudoKYCManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_kyc)

        kycManager = UqudoKYCManager(this)
        kycManager.initializeSDK()

        startKYCButton.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val result = kycManager.performKYCEnrollment()
                    showSuccessScreen(result)
                } catch (e: Exception) {
                    showErrorScreen(e.message)
                }
            }
        }
    }
}
```

---

## iOS (Swift) Integration

### Podfile

```ruby
# Podfile
platform :ios, '13.0'

target 'YourApp' do
  use_frameworks!

  pod 'UqudoSDK'
  pod 'Alamofire' # For webhook calls
end
```

### Complete Implementation

```swift
import UIKit
import UqudoSDK
import Alamofire

class UqudoKYCManager {

    private let sdk = UqudoSDK.shared

    // Your Vercel deployment URL
    private let webhookURL = "https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws"
    private let tenantID = "YOUR_TENANT_ID" // Get from admin portal

    func initializeSDK() {
        sdk.initialize(
            apiKey: "YOUR_API_KEY",
            apiSecret: "YOUR_API_SECRET",
            environment: .production
        )
    }

    func performKYCEnrollment(completion: @escaping (Result<UqudoResult, Error>) -> Void) {
        // Configure enrollment with background checks
        let config = EnrollmentConfiguration()

        // Document types
        config.documentTypes = [.passport, .emiratesID, .drivingLicense]

        // Enable NFC reading
        config.enableNFC = true

        // Face verification
        config.enableFaceMatch = true
        config.enableLiveness = true

        // CRITICAL: Enable background checks
        config.enableBackgroundCheck = true

        // Background check configuration
        let backgroundCheckConfig = BackgroundCheckConfiguration()
        backgroundCheckConfig.enablePEPScreening = true
        backgroundCheckConfig.enableSanctionsScreening = true
        backgroundCheckConfig.enableAdverseMediaScreening = true
        backgroundCheckConfig.enableMonitoring = true

        // Webhook configuration
        backgroundCheckConfig.webhookURL = webhookURL
        backgroundCheckConfig.headers = [
            "X-Tenant-ID": tenantID,
            "Content-Type": "application/json"
        ]

        config.backgroundCheckConfiguration = backgroundCheckConfig

        // CRITICAL: Enable analytics
        config.enableAnalytics = true

        // Analytics configuration
        let analyticsConfig = AnalyticsConfiguration()
        analyticsConfig.trackScreenViews = true
        analyticsConfig.trackUserActions = true
        analyticsConfig.trackErrors = true
        analyticsConfig.analyticsEndpoint = "\(webhookURL)/analytics"
        analyticsConfig.customProperties = [
            "app_version": "1.0.0",
            "platform": "ios"
        ]

        config.analyticsConfiguration = analyticsConfig

        // Start enrollment
        sdk.enroll(with: config) { result in
            switch result {
            case .success(let enrollmentResult):
                print("✅ Enrollment successful")
                print("JWS Token: \(enrollmentResult.jwsToken)")

                // SDK automatically sends to webhook
                // Optionally verify receipt
                self.verifyWebhookReceipt(jwsToken: enrollmentResult.jwsToken)

                completion(.success(enrollmentResult))

            case .failure(let error):
                print("❌ Enrollment failed: \(error.localizedDescription)")
                completion(.failure(error))
            }
        }
    }

    private func verifyWebhookReceipt(jwsToken: String) {
        let parameters: [String: Any] = ["token": jwsToken]
        let headers: HTTPHeaders = [
            "X-Tenant-ID": tenantID,
            "Content-Type": "application/json"
        ]

        AF.request(
            webhookURL,
            method: .post,
            parameters: parameters,
            encoding: JSONEncoding.default,
            headers: headers
        ).responseJSON { response in
            switch response.result {
            case .success(let value):
                if let json = value as? [String: Any],
                   let data = json["data"] as? [String: Any],
                   let account = data["account"] as? [String: Any] {
                    print("✅ Webhook received:")
                    print("Account ID: \(account["account_id"] ?? "N/A")")
                    print("AML Status: \(account["aml_status"] ?? "N/A")")
                }
            case .failure(let error):
                print("❌ Webhook failed: \(error.localizedDescription)")
            }
        }
    }
}
```

### ViewController Usage

```swift
class KYCViewController: UIViewController {

    let kycManager = UqudoKYCManager()

    override func viewDidLoad() {
        super.viewDidLoad()

        kycManager.initializeSDK()
    }

    @IBAction func startKYCButtonTapped(_ sender: UIButton) {
        kycManager.performKYCEnrollment { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let enrollmentResult):
                    self.showSuccessScreen(result: enrollmentResult)
                case .failure(let error):
                    self.showErrorAlert(error: error)
                }
            }
        }
    }
}
```

---

## Testing the Integration

### 1. Get Your Tenant ID

```javascript
// In admin portal, open browser console (F12) and run:
JSON.parse(localStorage.getItem('user_data')).tenantId
```

Copy this tenant ID and use it in your mobile app configuration.

### 2. Test Enrollment Flow

1. **Run the mobile app**
2. **Complete KYC enrollment**:
   - Scan document (passport/ID)
   - Take selfie
   - Complete liveness check
   - For NFC-enabled documents, read chip data

3. **Monitor the process**:
   ```kotlin
   // Android logs
   adb logcat | grep Uqudo
   ```

   ```swift
   // iOS console
   // Watch for UqudoSDK logs
   ```

### 3. Verify in Admin Portal

After SDK submission, check your admin portal:

**URL**: `https://uqudo-admin-portal.vercel.app/pages/accounts`

You should see:
- ✅ **New account created** with user information
- ✅ **AML Status**:
  - `AML Clear` - No background check matches
  - `AML Match Found` - Matches found (PEP/Sanctions)
- ✅ **If matches found**:
  - Alert created in Alerts page
  - Case created in Cases page with full match details

### 4. Check Vercel Logs

Monitor your deployment:

1. Go to: `https://vercel.com/dashboard`
2. Select your project: `uqudo-admin-portal`
3. Click **"Logs"** or **"Functions"** tab
4. Look for:
   ```
   📱 SDK JWS Request: { method: 'POST', ... }
   ✅ Created new account: uuid
   ✅ Account marked as AML Clear
   ```

   Or if matches found:
   ```
   🚨 Background check found X matches
   ✅ Created alert: uuid
   ✅ Created AML case: BGC-xxxxx
   ```

### 5. Test Background Check Matches

To test with known entities (sandbox):

```dart
// Use test data that will trigger matches
final config = EnrollmentConfig(
  // ... other config
  backgroundCheckConfig: BackgroundCheckConfig(
    testMode: true, // Use sandbox test data
    testEntity: 'Vladimir Putin', // Will trigger PEP match
  ),
);
```

Expected behavior:
- Account created
- AML status = `aml_match_found`
- Alert created with priority based on risk score
- Case created with full entity details

---

## Configuration Summary

| Feature | Configuration Key | Required | Default |
|---------|------------------|----------|---------|
| Background Checks | `enableBackgroundCheck` | ✅ Yes | false |
| PEP Screening | `enablePEPScreening` | ✅ Yes | false |
| Sanctions Screening | `enableSanctionsScreening` | ✅ Yes | false |
| Adverse Media | `enableAdverseMediaScreening` | Recommended | false |
| Monitoring | `enableMonitoring` | Recommended | false |
| Webhook URL | `webhookUrl` | ✅ Yes | - |
| Tenant ID Header | `X-Tenant-ID` | ✅ Yes | - |
| Analytics | `enableAnalytics` | ✅ Yes | false |
| NFC Reading | `enableNFC` | Recommended | false |
| Liveness Check | `enableLiveness` | ✅ Yes | false |

---

## Troubleshooting

### Issue 1: No Records in Admin Portal

**Symptoms**: SDK completes but no account appears

**Causes**:
- Tenant ID mismatch
- Webhook URL incorrect
- Network error

**Solution**:
1. Check mobile logs for HTTP response
2. Verify tenant ID matches portal
3. Check Vercel function logs
4. See `/DEBUG_NO_RECORDS.md` for detailed steps

### Issue 2: 405 Method Not Allowed

**Cause**: Using placeholder URL or incorrect endpoint

**Solution**:
```kotlin
// ❌ Wrong
val webhookURL = "https://your-app.vercel.app/api/sdk-verification/enrollment-jws"

// ✅ Correct - use your actual Vercel URL
val webhookURL = "https://uqudo-admin-portal.vercel.app/api/sdk-verification/enrollment-jws"
```

### Issue 3: Background Checks Not Running

**Cause**: Background checks not enabled in SDK config

**Solution**:
```dart
// Must explicitly enable
backgroundCheckConfig: BackgroundCheckConfig(
  enablePEPScreening: true,        // ✅ Required
  enableSanctionsScreening: true,  // ✅ Required
  webhookUrl: 'YOUR_URL',          // ✅ Required
)
```

### Issue 4: Analytics Not Tracking

**Cause**: Analytics not enabled or endpoint incorrect

**Solution**:
```swift
config.enableAnalytics = true  // ✅ Must enable
analyticsConfig.trackScreenViews = true  // ✅ Enable tracking
```

---

## Next Steps

1. ✅ **Configure SDK** with background checks and analytics enabled
2. ✅ **Update webhook URL** to your actual Vercel deployment
3. ✅ **Add tenant ID header** for proper multi-tenant support
4. ✅ **Test enrollment** and verify records appear in portal
5. ✅ **Monitor logs** in Vercel and Supabase
6. ✅ **Configure thresholds** in KYC Setup page

---

## Support

- **Uqudo SDK Docs**: https://docs.uqudo.com/docs/kyc/uqudo-sdk/
- **Admin Portal**: https://uqudo-admin-portal.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
**Status**: Production Ready ✅
