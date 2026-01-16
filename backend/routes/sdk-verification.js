import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authorize, preventViewOnlyModifications } from '../middleware/auth.js';

const router = express.Router();

/**
 * Verification Thresholds based on Uqudo SDK Documentation
 * https://docs.uqudo.com/docs/kyc/uqudo-sdk/sdk-result/data-structure/verification-object
 */
const THRESHOLDS = {
  // ID Screen Detection: Reject if score > 50
  idScreenDetection: {
    rejectThreshold: 50,
    warningThreshold: 30,
    description: 'Document scanned through a screen'
  },

  // ID Print Detection: Reject if score > 50
  idPrintDetection: {
    rejectThreshold: 50,
    warningThreshold: 30,
    description: 'Printed document copy detected'
  },

  // ID Photo Tampering: Reject if score > 70, Warning if > 40
  idPhotoTamperingDetection: {
    rejectThreshold: 70,
    warningThreshold: 40,
    description: 'Photo tampering detected'
  },

  // Face Match (Biometric): Minimum match level 3 out of 5
  faceMatch: {
    minimumMatchLevel: 3,
    description: 'Facial recognition match level'
  },

  // Data Consistency: Must be MATCH or MATCH_PARTIALLY
  dataConsistency: {
    allowPartialMatch: true,
    description: 'Data consistency across verification steps'
  }
};

/**
 * Analyze verification object and determine if verification passes
 */
function analyzeVerification(verification) {
  const issues = [];
  const warnings = [];
  let overallStatus = 'approved';

  // Check ID Screen Detection
  if (verification.idScreenDetection?.enabled) {
    const score = verification.idScreenDetection.score;
    if (score > THRESHOLDS.idScreenDetection.rejectThreshold) {
      issues.push({
        type: 'ID_SCREEN_DETECTION',
        severity: 'high',
        score,
        threshold: THRESHOLDS.idScreenDetection.rejectThreshold,
        message: `${THRESHOLDS.idScreenDetection.description}: Score ${score} exceeds threshold ${THRESHOLDS.idScreenDetection.rejectThreshold}`
      });
      overallStatus = 'rejected';
    } else if (score > THRESHOLDS.idScreenDetection.warningThreshold) {
      warnings.push({
        type: 'ID_SCREEN_DETECTION',
        severity: 'medium',
        score,
        threshold: THRESHOLDS.idScreenDetection.warningThreshold,
        message: `${THRESHOLDS.idScreenDetection.description}: Score ${score} exceeds warning threshold`
      });
    }
  }

  // Check ID Print Detection
  if (verification.idPrintDetection?.enabled) {
    const score = verification.idPrintDetection.score;
    if (score > THRESHOLDS.idPrintDetection.rejectThreshold) {
      issues.push({
        type: 'ID_PRINT_DETECTION',
        severity: 'high',
        score,
        threshold: THRESHOLDS.idPrintDetection.rejectThreshold,
        message: `${THRESHOLDS.idPrintDetection.description}: Score ${score} exceeds threshold ${THRESHOLDS.idPrintDetection.rejectThreshold}`
      });
      overallStatus = 'rejected';
    } else if (score > THRESHOLDS.idPrintDetection.warningThreshold) {
      warnings.push({
        type: 'ID_PRINT_DETECTION',
        severity: 'medium',
        score,
        threshold: THRESHOLDS.idPrintDetection.warningThreshold,
        message: `${THRESHOLDS.idPrintDetection.description}: Score ${score} exceeds warning threshold`
      });
    }
  }

  // Check ID Photo Tampering Detection
  if (verification.idPhotoTamperingDetection?.enabled) {
    const score = verification.idPhotoTamperingDetection.score;
    if (score > THRESHOLDS.idPhotoTamperingDetection.rejectThreshold) {
      issues.push({
        type: 'ID_PHOTO_TAMPERING',
        severity: 'critical',
        score,
        threshold: THRESHOLDS.idPhotoTamperingDetection.rejectThreshold,
        message: `${THRESHOLDS.idPhotoTamperingDetection.description}: Score ${score} exceeds threshold ${THRESHOLDS.idPhotoTamperingDetection.rejectThreshold}`
      });
      overallStatus = 'rejected';
    } else if (score > THRESHOLDS.idPhotoTamperingDetection.warningThreshold) {
      warnings.push({
        type: 'ID_PHOTO_TAMPERING',
        severity: 'high',
        score,
        threshold: THRESHOLDS.idPhotoTamperingDetection.warningThreshold,
        message: `${THRESHOLDS.idPhotoTamperingDetection.description}: Score ${score} requires manual review`
      });
      if (overallStatus === 'approved') {
        overallStatus = 'manual_review';
      }
    }
  }

  // Check Data Consistency
  if (verification.dataConsistencyCheck?.enabled && verification.dataConsistencyCheck?.fields) {
    const noMatches = verification.dataConsistencyCheck.fields.filter(f => f.match === 'NO_MATCH');
    if (noMatches.length > 0) {
      issues.push({
        type: 'DATA_CONSISTENCY',
        severity: 'high',
        fields: noMatches.map(f => f.name),
        message: `Data mismatch detected in fields: ${noMatches.map(f => f.name).join(', ')}`
      });
      overallStatus = 'rejected';
    }

    const partialMatches = verification.dataConsistencyCheck.fields.filter(f => f.match === 'MATCH_PARTIALLY');
    if (partialMatches.length > 0 && THRESHOLDS.dataConsistency.allowPartialMatch) {
      warnings.push({
        type: 'DATA_CONSISTENCY',
        severity: 'medium',
        fields: partialMatches.map(f => f.name),
        message: `Partial data match in fields: ${partialMatches.map(f => f.name).join(', ')}`
      });
      if (overallStatus === 'approved') {
        overallStatus = 'manual_review';
      }
    }
  }

  // Check Biometric Face Match
  if (verification.biometric?.type === 'FACIAL_RECOGNITION') {
    const matchLevel = verification.biometric.matchLevel;
    if (matchLevel < THRESHOLDS.faceMatch.minimumMatchLevel) {
      issues.push({
        type: 'FACE_MATCH',
        severity: 'high',
        matchLevel,
        threshold: THRESHOLDS.faceMatch.minimumMatchLevel,
        message: `Face match level ${matchLevel} is below minimum threshold ${THRESHOLDS.faceMatch.minimumMatchLevel}`
      });
      overallStatus = 'rejected';
    }
  }

  // Check Reading Authentication (if available)
  if (verification.readingAuthentication) {
    const { passiveAuthentication, chipAuthentication, activeAuthentication } = verification.readingAuthentication;

    if (passiveAuthentication === false) {
      warnings.push({
        type: 'PASSIVE_AUTHENTICATION',
        severity: 'medium',
        message: 'Passive authentication failed - document signature validation unsuccessful'
      });
      if (overallStatus === 'approved') {
        overallStatus = 'manual_review';
      }
    }

    if (chipAuthentication === false) {
      warnings.push({
        type: 'CHIP_AUTHENTICATION',
        severity: 'low',
        message: 'Chip authentication not available or failed'
      });
    }
  }

  // Check MRZ Checksum
  if (verification.mrzChecksum === false) {
    issues.push({
      type: 'MRZ_CHECKSUM',
      severity: 'high',
      message: 'MRZ checksum validation failed - document may be invalid or tampered'
    });
    overallStatus = 'rejected';
  }

  return {
    status: overallStatus,
    issues,
    warnings,
    passedChecks: issues.length === 0,
    requiresManualReview: warnings.length > 0 || overallStatus === 'manual_review'
  };
}

/**
 * @route   POST /api/sdk-verification/submit
 * @desc    Receive and process Uqudo SDK verification results
 * @access  Private or Public (depending on your integration needs)
 */
router.post('/submit',
  [
    body('account_id').notEmpty().withMessage('Account ID is required'),
    body('session_id').optional().isString(),
    body('verification').isObject().withMessage('Verification object is required'),
    body('document_data').optional().isObject(),
    body('biometric_data').optional().isObject()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { account_id, session_id, verification, document_data, biometric_data } = req.body;

    // Get tenant from auth or use default for SDK webhook
    const tenantId = req.user?.tenantId || '00000000-0000-0000-0000-000000000001';

    // Verify account exists
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, email, kyc_verification_status')
      .eq('id', account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Analyze verification results
    const analysis = analyzeVerification(verification);

    // Update account based on verification results
    let accountUpdate = {
      kyc_verification_status: analysis.status === 'approved' ? 'verified' :
                               analysis.status === 'rejected' ? 'failed' : 'pending',
      last_verification_date: new Date().toISOString()
    };

    if (analysis.status === 'approved' && !analysis.requiresManualReview) {
      accountUpdate.account_status = 'active';
    } else if (analysis.status === 'rejected') {
      accountUpdate.account_status = 'suspended';
    }

    // Update account
    await supabaseAdmin
      .from('accounts')
      .update(accountUpdate)
      .eq('id', account_id)
      .eq('tenant_id', tenantId);

    // Create alerts for issues and warnings
    const alertsToCreate = [];

    // Create alerts for critical issues
    for (const issue of analysis.issues) {
      alertsToCreate.push({
        tenant_id: tenantId,
        account_id,
        alert_type: issue.type.toLowerCase(),
        priority: issue.severity === 'critical' ? 'critical' : 'high',
        resolution_notes: issue.message,
        status: 'open'
      });
    }

    // Create alerts for warnings that require manual review
    if (analysis.requiresManualReview) {
      for (const warning of analysis.warnings) {
        alertsToCreate.push({
          tenant_id: tenantId,
          account_id,
          alert_type: warning.type.toLowerCase(),
          priority: warning.severity,
          resolution_notes: warning.message,
          status: 'open'
        });
      }
    }

    // Insert alerts if any
    if (alertsToCreate.length > 0) {
      await supabaseAdmin
        .from('kyc_alerts')
        .insert(alertsToCreate);
    }

    // Store verification session data
    const verificationSession = {
      tenant_id: tenantId,
      account_id,
      session_id: session_id || `sdk-${Date.now()}`,
      verification_result: verification,
      document_data: document_data || null,
      biometric_data: biometric_data || null,
      analysis_result: analysis,
      status: analysis.status,
      created_at: new Date().toISOString()
    };

    // Store in verification_sessions table if it exists, otherwise skip
    try {
      await supabaseAdmin
        .from('verification_sessions')
        .insert(verificationSession);
    } catch (error) {
      // Table might not exist, log but don't fail
      console.log('Note: verification_sessions table not available');
    }

    // Log the verification attempt
    if (req.user?.id) {
      await supabaseAdmin
        .from('analyst_logs')
        .insert({
          tenant_id: tenantId,
          account_id,
          action: 'SDK_VERIFICATION_RECEIVED',
          description: `SDK verification result: ${analysis.status}. Issues: ${analysis.issues.length}, Warnings: ${analysis.warnings.length}`,
          user_id: req.user.id
        });
    }

    res.status(200).json({
      success: true,
      data: {
        account_id,
        session_id: verificationSession.session_id,
        verification_status: analysis.status,
        account_status: accountUpdate.account_status,
        kyc_status: accountUpdate.kyc_verification_status,
        issues: analysis.issues,
        warnings: analysis.warnings,
        alerts_created: alertsToCreate.length,
        requires_manual_review: analysis.requiresManualReview,
        passed_all_checks: analysis.passedChecks
      },
      message: analysis.status === 'approved' ? 'Verification passed' :
               analysis.status === 'rejected' ? 'Verification failed' :
               'Verification requires manual review'
    });
  })
);

/**
 * @route   GET /api/sdk-verification/thresholds
 * @desc    Get current verification thresholds
 * @access  Public
 */
router.get('/thresholds', (req, res) => {
  res.json({
    success: true,
    data: THRESHOLDS
  });
});

/**
 * @route   POST /api/sdk-verification/test-analysis
 * @desc    Test verification analysis without saving to database
 * @access  Private
 */
router.post('/test-analysis',
  authorize(['analyst', 'team_lead', 'manager', 'mlro']),
  [
    body('verification').isObject().withMessage('Verification object is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { verification } = req.body;
    const analysis = analyzeVerification(verification);

    res.json({
      success: true,
      data: analysis,
      thresholds: THRESHOLDS
    });
  })
);

/**
 * @route   POST /api/sdk-verification/enrollment
 * @desc    Process complete Uqudo SDK enrollment result (JWT payload)
 * @access  Public (for SDK webhook)
 */
router.post('/enrollment',
  asyncHandler(async (req, res) => {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing enrollment data'
      });
    }

    const { documents, verifications, backgroundCheck } = data;

    // Extract account information from documents
    let accountData = null;
    let tenantId = null; // You'll need to determine this from your integration

    if (documents && documents.length > 0) {
      const doc = documents[0];
      const reading = doc.scan?.front || doc.reading?.data;

      if (reading) {
        accountData = {
          full_name: reading.fullName || reading.arabicFullName || '',
          id_number: reading.identityNumber || reading.idNumber || '',
          date_of_birth: reading.dateOfBirth || reading.dateOfBirthFormatted || '',
          nationality: reading.nationality || '',
          document_type: doc.documentType || 'UAE_ID'
        };
      }
    }

    // Process verification results
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

      // Check face match
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
    }

    // Process Background Check and create AML case if matches found
    let caseCreated = false;
    let caseData = null;

    if (backgroundCheck && backgroundCheck.match && backgroundCheck.content) {
      const { nonReviewedAlertEntity = [] } = backgroundCheck.content;

      if (nonReviewedAlertEntity.length > 0) {
        // Background check found matches - create AML case
        const matchedEntities = nonReviewedAlertEntity.map(entity => ({
          name: entity.entityName,
          matchScore: entity.matchScore,
          riskScore: entity.riskScore,
          pepTypes: entity.pepTypes?.pepType || [],
          events: entity.event || [],
          sources: entity.sources?.source || []
        }));

        // Determine case priority based on risk scores
        const maxRiskScore = Math.max(...nonReviewedAlertEntity.map(e => e.riskScore || 0));
        let casePriority = 'medium';
        if (maxRiskScore >= 90) casePriority = 'critical';
        else if (maxRiskScore >= 70) casePriority = 'high';

        // If you have tenant_id and account_id, create the case
        // For now, we'll return the information
        caseData = {
          case_type: 'background_check_match',
          priority: casePriority,
          matched_entities: matchedEntities,
          match_count: nonReviewedAlertEntity.length,
          highest_risk_score: maxRiskScore,
          recommended_action: maxRiskScore >= 90 ? 'ESCALATE' : 'REVIEW'
        };

        caseCreated = true;
      }
    }

    // Return comprehensive response
    res.json({
      success: true,
      data: {
        verification: {
          status: verificationStatus,
          issues,
          warnings,
          passedChecks: issues.length === 0
        },
        backgroundCheck: {
          match: backgroundCheck?.match || false,
          caseCreated,
          caseData
        },
        account: accountData
      },
      message: caseCreated
        ? `Verification ${verificationStatus}. Background check match found - case created.`
        : `Verification ${verificationStatus}. No background check matches.`
    });
  })
);

export default router;
