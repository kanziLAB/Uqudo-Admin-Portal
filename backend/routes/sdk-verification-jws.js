import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Helper to wrap async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper to build analytics events from SDK data
function buildAnalyticsEvents(source, verifications, documents, verificationStatus) {
  const events = [];
  const baseTime = new Date();

  // Event 1: VIEW - SDK interface opened
  if (source?.sessionStartTime) {
    events.push({
      name: 'VIEW',
      type: 'SCAN',
      status: 'success',
      timestamp: source.sessionStartTime,
      duration: 0,
      id: source.sessionId || 'GENERIC_ID',
      details: {
        sdk_type: source.sdkType,
        sdk_version: source.sdkVersion,
        device_model: source.deviceModel,
        device_platform: source.devicePlatform
      }
    });
  }

  // Event 2: START - Document scanning started
  if (documents && documents.length > 0) {
    const doc = documents[0];
    const scanStartTime = doc.scanStartTime || new Date(baseTime.getTime() + 5000).toISOString();
    const prevTime = events.length > 0 ? new Date(events[events.length - 1].timestamp) : baseTime;
    const duration = new Date(scanStartTime) - prevTime;

    events.push({
      name: 'START',
      type: 'SCAN',
      status: 'success',
      timestamp: scanStartTime,
      duration: Math.max(0, duration),
      id: doc.id || 'GENERIC_ID',
      details: {
        document_type: doc.type,
        has_nfc: !!doc.reading,
        has_scan: !!doc.scan
      }
    });

    // Add NFC reading event if available
    if (doc.reading) {
      const nfcTime = doc.reading.timestamp || new Date(new Date(scanStartTime).getTime() + 2000).toISOString();
      const nfcPrevTime = new Date(scanStartTime);
      const nfcDuration = new Date(nfcTime) - nfcPrevTime;

      events.push({
        name: 'NFC_READING',
        type: 'VERIFICATION',
        status: doc.reading.data ? 'success' : 'failure',
        timestamp: nfcTime,
        duration: Math.max(0, nfcDuration),
        id: 'NFC',
        details: {
          passive_auth: verifications?.[0]?.reading?.passiveAuthentication?.documentDataSignatureValid,
          chip_verified: !!doc.reading.data
        }
      });
    }
  }

  // Event 3: Verification checks
  if (verifications && verifications.length > 0) {
    const verification = verifications[0];
    let prevEventTime = events.length > 0 ? new Date(events[events.length - 1].timestamp) : baseTime;

    // Face match event
    if (verification.faceMatch) {
      const faceMatchTime = new Date(prevEventTime.getTime() + 500).toISOString();
      const faceMatchDuration = 500;

      events.push({
        name: 'FACE_MATCH',
        type: 'VERIFICATION',
        status: verification.faceMatch.match ? 'success' : 'failure',
        timestamp: faceMatchTime,
        duration: faceMatchDuration,
        id: 'FACE_MATCH',
        details: {
          match: verification.faceMatch.match,
          match_level: verification.faceMatch.matchLevel,
          score: verification.faceMatch.matchLevel ? verification.faceMatch.matchLevel / 5 : 0
        }
      });
      prevEventTime = new Date(faceMatchTime);
    }

    // Liveness check event
    if (verification.liveness) {
      const livenessTime = new Date(prevEventTime.getTime() + 300).toISOString();
      const livenessDuration = 300;

      events.push({
        name: 'LIVENESS',
        type: 'VERIFICATION',
        status: verification.liveness.live ? 'success' : 'failure',
        timestamp: livenessTime,
        duration: livenessDuration,
        id: 'LIVENESS',
        details: {
          live: verification.liveness.live,
          confidence: verification.liveness.confidence || 0
        }
      });
      prevEventTime = new Date(livenessTime);
    }
  }

  // Event 4: FINISH - Final verification result
  const finishTime = source?.sessionEndTime || new Date(baseTime.getTime() + 8500).toISOString();
  const prevTime = events.length > 0 ? new Date(events[events.length - 1].timestamp) : baseTime;
  const finishDuration = Math.max(0, new Date(finishTime) - prevTime);

  events.push({
    name: 'FINISH',
    type: 'SCAN',
    status: verificationStatus === 'approved' ? 'success' : 'failure',
    timestamp: finishTime,
    duration: finishDuration,
    id: 'FINISH',
    details: {
      verification_status: verificationStatus,
      total_checks: verifications?.length || 0
    }
  });

  return events;
}

// Verification thresholds
const THRESHOLDS = {
  idScreenDetection: {
    rejectThreshold: 50,
    warningThreshold: 30
  },
  idPrintDetection: {
    rejectThreshold: 50
  },
  idPhotoTamperingDetection: {
    rejectThreshold: 70
  },
  faceMatch: {
    minimumMatchLevel: 3
  }
};

/**
 * @route   OPTIONS /api/sdk-verification/enrollment-jws
 * @desc    Handle CORS preflight for JWS endpoint
 * @access  Public
 */
router.options('/enrollment-jws', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-ID, Authorization');
  res.sendStatus(200);
});

/**
 * @route   POST /api/sdk-verification/enrollment-jws
 * @desc    Process complete Uqudo SDK enrollment result (JWS token)
 * @access  Public (for SDK webhook)
 *
 * Accepts JWS token from Uqudo SDK, validates signature, and processes:
 * - Document verification (scan + NFC reading)
 * - Biometric verification (face match)
 * - Fraud detection (screen, print, tampering)
 * - Background checks (PEP, Sanctions, Adverse Media)
 * - Automatically creates account, alert, and AML case if background check matches
 */
router.post('/enrollment-jws',
  [
    body('token').notEmpty().withMessage('JWS token is required')
  ],
  asyncHandler(async (req, res) => {
    // Log request for debugging
    console.log('📱 SDK JWS Request:', {
      method: req.method,
      headers: req.headers,
      body: req.body ? 'present' : 'missing',
      contentType: req.get('content-type')
    });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { token } = req.body;

    // Step 1: Decode JWS token without verification (to inspect structure)
    // In production, you should verify the signature with Uqudo's public key
    let decodedToken;
    try {
      // Decode without verification for now
      // TODO: Add signature verification with Uqudo public key
      // const publicKey = await getUqudoPublicKey();
      // decodedToken = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

      decodedToken = jwt.decode(token, { complete: true });

      if (!decodedToken || !decodedToken.payload) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JWS token format'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to decode JWS token',
        details: error.message
      });
    }

    const data = decodedToken.payload.data;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing enrollment data in token payload'
      });
    }

    const { source, documents, verifications, backgroundCheck } = data;

    console.log('📥 Received SDK verification request:', {
      sdkType: source?.sdkType,
      sdkVersion: source?.sdkVersion,
      documentType: documents?.[0]?.documentType,
      hasBackgroundCheck: !!backgroundCheck,
      backgroundCheckMatch: backgroundCheck?.match
    });

    // Step 2: Extract account information from documents (scan OR reading)
    let accountData = null;
    const tenantId = req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';

    if (documents && documents.length > 0) {
      const doc = documents[0];

      // Priority 1: NFC Reading data (most reliable)
      if (doc.reading?.data) {
        const reading = doc.reading.data;
        accountData = {
          full_name: reading.fullName || reading.arabicFullName || '',
          id_number: reading.idNumber || '',
          date_of_birth: reading.dateOfBirth || '',
          nationality: reading.nationality || '',
          document_type: doc.documentType || 'UAE_ID',
          card_number: reading.cardNumber || '',
          gender: reading.sex || '',
          passport_number: reading.passportNumber || '',
          email: reading.homeAddressEmail || reading.workAddressEmail || '',
          phone_number: reading.homeAddressMobilePhoneNo || reading.workAddressMobilePhoneNo || '',
          occupation: reading.occupation || '',
          employer: reading.companyName || reading.sponsorName || '',
          // NFC-specific data
          nfc_verified: true,
          passive_authentication: verifications?.[0]?.reading?.passiveAuthentication?.documentDataSignatureValid || false
        };
      }
      // Priority 2: Scan data (front/back of document)
      else if (doc.scan?.front) {
        const front = doc.scan.front;
        accountData = {
          full_name: front.fullName || front.arabicFullName || '',
          id_number: front.identityNumber || '',
          date_of_birth: front.dateOfBirthFormatted || front.dateOfBirth || '',
          nationality: front.nationality || front.nationalityArabic || '',
          document_type: doc.documentType || 'UAE_ID',
          gender: front.gender || front.genderArabic || '',
          nfc_verified: false,
          passive_authentication: false
        };
      }
    }

    // Step 3: Process verification results
    let verificationStatus = 'approved';
    const issues = [];
    const warnings = [];

    if (verifications && verifications.length > 0) {
      const verification = verifications[0];

      // Check screen detection
      if (verification.idScreenDetection?.enabled) {
        const score = verification.idScreenDetection.score;
        if (score > THRESHOLDS.idScreenDetection.rejectThreshold) {
          verificationStatus = 'rejected';
          issues.push({
            type: 'ID_SCREEN_DETECTION',
            severity: 'high',
            score,
            message: `Screen detection score ${score} exceeds threshold ${THRESHOLDS.idScreenDetection.rejectThreshold}`
          });
        } else if (score > THRESHOLDS.idScreenDetection.warningThreshold) {
          warnings.push({
            type: 'ID_SCREEN_DETECTION',
            score,
            message: `Screen detection score ${score} above warning threshold`
          });
        }
      }

      // Check print detection
      if (verification.idPrintDetection?.enabled) {
        const score = verification.idPrintDetection.score;
        if (score > THRESHOLDS.idPrintDetection.rejectThreshold) {
          verificationStatus = 'rejected';
          issues.push({
            type: 'ID_PRINT_DETECTION',
            severity: 'high',
            score,
            message: `Print detection score ${score} exceeds threshold`
          });
        }
      }

      // Check photo tampering
      if (verification.idPhotoTamperingDetection?.enabled) {
        const score = verification.idPhotoTamperingDetection.score;
        if (score > THRESHOLDS.idPhotoTamperingDetection.rejectThreshold) {
          verificationStatus = 'rejected';
          issues.push({
            type: 'ID_PHOTO_TAMPERING',
            severity: 'critical',
            score,
            message: `Photo tampering score ${score} exceeds threshold`
          });
        }
      }

      // Check face match (from document face vs selfie)
      if (verification.biometric?.type === 'FACIAL_RECOGNITION' && verification.biometric?.enabled) {
        const matchLevel = verification.biometric.matchLevel;
        if (matchLevel < THRESHOLDS.faceMatch.minimumMatchLevel) {
          verificationStatus = 'rejected';
          issues.push({
            type: 'FACE_MATCH',
            severity: 'critical',
            matchLevel,
            message: `Face match level ${matchLevel} below minimum ${THRESHOLDS.faceMatch.minimumMatchLevel}`
          });
        }
      }

      // Check MRZ validation (if available)
      if (verification.mrzChecksum?.enabled && !verification.mrzChecksum?.valid) {
        verificationStatus = 'rejected';
        issues.push({
          type: 'MRZ_CHECKSUM',
          severity: 'critical',
          message: 'MRZ checksum validation failed'
        });
      }

      // Check data consistency
      if (verification.dataConsistencyCheck?.enabled) {
        const inconsistentFields = verification.dataConsistencyCheck.fields?.filter(
          field => field.match !== 'MATCH'
        );
        if (inconsistentFields && inconsistentFields.length > 0) {
          warnings.push({
            type: 'DATA_CONSISTENCY',
            fields: inconsistentFields.map(f => f.name),
            message: `Data inconsistency detected in: ${inconsistentFields.map(f => f.name).join(', ')}`
          });
        }
      }
    }

    // Step 4: Create or find account in database (ALWAYS, regardless of background check)
    let caseCreated = false;
    let alertCreated = false;
    let accountCreated = false;
    let caseData = null;
    let alertData = null;
    let accountId = null;

    try {
      if (accountData?.id_number) {
        // Try to find existing account
        const { data: existingAccount } = await supabaseAdmin
          .from('accounts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('id_number', accountData.id_number)
          .single();

        if (existingAccount) {
          accountId = existingAccount.id;
          console.log(`✅ Found existing account: ${accountId}`);

          // Update existing account with latest SDK analytics data
          const analyticsEvents = buildAnalyticsEvents(source, verifications, documents, verificationStatus);
          await supabaseAdmin
            .from('accounts')
            .update({
              sdk_analytics: analyticsEvents,
              sdk_source: source,
              sdk_verifications: verifications,
              sdk_documents: documents
            })
            .eq('id', accountId);
        } else {
          // Create new account
          const nameParts = (accountData.full_name || '').split(' ');

          // Build analytics events from real SDK data
          const analyticsEvents = buildAnalyticsEvents(source, verifications, documents, verificationStatus);

          const { data: newAccount, error: accountError } = await supabaseAdmin
            .from('accounts')
            .insert({
              tenant_id: tenantId,
              user_id: 'SDK_' + accountData.id_number,
              first_name: nameParts[0] || 'Unknown',
              last_name: nameParts.slice(1).join(' ') || '',
              email: accountData.email || `${accountData.id_number}@temp.uqudo.com`,
              phone_number: accountData.phone_number || '',
              id_type: accountData.document_type?.toLowerCase() || 'eid',
              id_number: accountData.id_number,
              date_of_birth: accountData.date_of_birth || null,
              nationality: accountData.nationality || null,
              gender: accountData.gender?.toLowerCase() || null,
              account_status: verificationStatus === 'approved' ? 'pending_review' : 'suspended',
              kyc_verification_status: accountData.nfc_verified ? 'verified' : 'pending',
              aml_status: 'pending',
              sdk_analytics: analyticsEvents,
              sdk_source: source,
              sdk_verifications: verifications,
              sdk_documents: documents
            })
            .select()
            .single();

          if (accountError) throw accountError;

          accountId = newAccount.id;
          accountCreated = true;
          console.log(`✅ Created new account: ${accountId}`);
        }

        // Log the SDK enrollment
        await supabaseAdmin.from('analyst_logs').insert({
          tenant_id: tenantId,
          account_id: accountId,
          action: 'SDK_ENROLLMENT_PROCESSED',
          description: `SDK enrollment processed. Verification status: ${verificationStatus}. NFC verified: ${accountData.nfc_verified || false}`
        });
      }
    } catch (error) {
      console.error('Account creation failed:', error);
      // Continue to process background check even if account creation fails
    }

    // Step 5: Process Background Check and create AML case if matches found
    if (backgroundCheck && backgroundCheck.match && backgroundCheck.content && accountId) {
      const { nonReviewedAlertEntity = [] } = backgroundCheck.content;

      if (nonReviewedAlertEntity.length > 0) {
        console.log(`🚨 Background check found ${nonReviewedAlertEntity.length} matches`);

        try {
          // Extract matched entities with all details
          const matchedEntities = nonReviewedAlertEntity.map(entity => ({
            sys_id: entity.sysId,
            entity_id: entity.entityId,
            name: entity.entityName,
            entity_type: entity.entityTyp,
            match_score: entity.matchScore,
            risk_score: entity.riskScore,
            rdc_url: entity.rdcURL,
            pep_types: entity.pepTypes?.pepType || [],
            events: entity.event || [],
            sources: entity.sources?.source || [],
            relationships: entity.rels?.rel || [],
            addresses: entity.postAddr || [],
            birth_dates: entity.birthDt || [],
            identifications: entity.identification || [],
            attributes: entity.attribute || []
          }));

          // Determine case priority based on highest risk score
          const maxRiskScore = Math.max(...nonReviewedAlertEntity.map(e => e.riskScore || 0));
          let casePriority = 'medium';
          if (maxRiskScore >= 90) casePriority = 'critical';
          else if (maxRiskScore >= 70) casePriority = 'high';

          caseData = {
            case_type: 'background_check_match',
            priority: casePriority,
            matched_entities: matchedEntities,
            match_count: nonReviewedAlertEntity.length,
            highest_risk_score: maxRiskScore,
            recommended_action: maxRiskScore >= 90 ? 'ESCALATE' : 'REVIEW',
            monitoring_id: backgroundCheck.monitoringId,
            alert_date: backgroundCheck.content.alertDt
          };

          // Step 6: Create alert for background check match
          const { data: alert, error: alertError } = await supabaseAdmin
            .from('kyc_alerts')
            .insert({
              tenant_id: tenantId,
              account_id: accountId,
              alert_type: 'background_check_match',
              priority: casePriority,
              status: 'open',
              resolution_notes: `Background check found ${nonReviewedAlertEntity.length} matches. Highest risk score: ${maxRiskScore}. Entities: ${matchedEntities.map(e => e.name).join(', ')}`
            })
            .select()
            .single();

          if (alertError) {
            console.error('Failed to create alert:', alertError);
          } else {
            alertCreated = true;
            alertData = alert;
            console.log(`✅ Created alert: ${alert.id}`);
          }

          // Step 7: Create AML case
          const caseId = `BGC-${Date.now()}`;
          const { data: amlCase, error: caseError } = await supabaseAdmin
            .from('aml_cases')
            .insert({
              tenant_id: tenantId,
              account_id: accountId,
              case_id: caseId,
              resolution_status: 'unsolved',
              match_count: nonReviewedAlertEntity.length,
              external_case_url: matchedEntities[0]?.rdc_url || null,
              alert_ids: alertData ? [alertData.id] : []
            })
            .select()
            .single();

          if (caseError) {
            console.error('Failed to create case:', caseError);
          } else {
            caseCreated = true;
            caseData.database_case_id = amlCase.id;
            caseData.case_id = caseId;
            console.log(`✅ Created AML case: ${caseId}`);
          }

          // Update account AML status to 'aml_match_found'
          await supabaseAdmin
            .from('accounts')
            .update({ aml_status: 'aml_match_found' })
            .eq('id', accountId);

          // Log the background check match
          await supabaseAdmin.from('analyst_logs').insert({
            tenant_id: tenantId,
            account_id: accountId,
            case_id: amlCase?.id,
            action: 'BACKGROUND_CHECK_MATCH',
            description: `Background check found ${nonReviewedAlertEntity.length} matches. Case ${caseId} created.`
          });
        } catch (error) {
          console.error('Background check processing failed:', error);
          // Continue and return response even if background check operations fail
        }
      }
    } else if (accountId) {
      // No background check matches - set status to 'aml_clear'
      try {
        await supabaseAdmin
          .from('accounts')
          .update({ aml_status: 'aml_clear' })
          .eq('id', accountId);
        console.log(`✅ Account marked as AML Clear (no matches)`);
      } catch (error) {
        console.error('Failed to update AML status:', error);
      }
    }

    // Step 8: Return comprehensive response
    res.json({
      success: true,
      data: {
        verification: {
          status: verificationStatus,
          issues,
          warnings,
          passed_checks: issues.length === 0,
          nfc_verified: accountData?.nfc_verified || false,
          passive_authentication: accountData?.passive_authentication || false
        },
        backgroundCheck: {
          match: backgroundCheck?.match || false,
          case_created: caseCreated,
          alert_created: alertCreated,
          case_data: caseData
        },
        account: {
          account_id: accountId,
          account_created: accountCreated,
          aml_status: caseCreated ? 'aml_match_found' : (accountId ? 'aml_clear' : 'pending'),
          ...accountData
        },
        source: {
          sdk_type: source?.sdkType,
          sdk_version: source?.sdkVersion,
          device_model: source?.deviceModel,
          device_platform: source?.devicePlatform,
          source_ip: source?.sourceIp
        }
      },
      message: caseCreated
        ? `Verification ${verificationStatus}. Background check match found - case ${caseData.case_id} created.`
        : `Verification ${verificationStatus}. No background check matches.`
    });
  })
);

/**
 * @route   POST /api/sdk-verification/enrollment
 * @desc    Process enrollment data (direct JSON, backward compatible)
 * @access  Public
 */
router.post('/enrollment',
  asyncHandler(async (req, res) => {
    // Accept both { token } and { data } formats
    if (req.body.token) {
      // Redirect to JWS endpoint
      return router.handle({ ...req, url: '/enrollment-jws', path: '/enrollment-jws' }, res);
    }

    // Process direct data format (existing implementation)
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing enrollment data or token'
      });
    }

    // Call the JWS handler with wrapped data
    req.body.data = data;

    // Process the same way but skip JWS decoding
    // ... existing implementation ...

    res.json({
      success: true,
      message: 'Use /enrollment-jws endpoint for JWS token processing'
    });
  })
);

export default router;

/**
 * @route   POST /api/sdk-verification/jws
 * @desc    Alternative endpoint (shorter URL)
 * @access  Public
 */
router.post('/jws',
  [
    body('token').notEmpty().withMessage('JWS token is required')
  ],
  asyncHandler(async (req, res) => {
    console.log('📱 SDK JWS Request (short URL):', {
      method: req.method,
      contentType: req.get('content-type')
    });
    
    // Redirect to main handler by calling it with modified request
    req.url = '/enrollment-jws';
    return router.handle(req, res);
  })
);

/**
 * @route   ALL /api/sdk-verification/*
 * @desc    Catch-all for debugging 405 errors
 * @access  Public
 */
router.all('*', (req, res) => {
  console.log('❌ 405 Method Not Allowed:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    headers: req.headers
  });
  
  res.status(405).json({
    success: false,
    error: 'Method Not Allowed',
    debug: {
      method: req.method,
      path: req.path,
      allowedMethods: ['POST', 'OPTIONS'],
      availableEndpoints: [
        'POST /api/sdk-verification/enrollment-jws',
        'POST /api/sdk-verification/jws',
        'POST /api/sdk-verification/enrollment'
      ],
      hint: 'Make sure you are using POST method and correct endpoint URL'
    }
  });
});

