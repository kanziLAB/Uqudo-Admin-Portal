// Debug script to check Android session data
// Run with: node debug-android-session.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAndroidSession() {
  console.log('🔍 Fetching most recent sessions...\n');

  // Get last 5 sessions
  const { data: sessions, error } = await supabase
    .from('accounts')
    .select('id, first_name, last_name, email, created_at, verification_channel, sdk_source, sdk_analytics, sdk_verifications')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  sessions.forEach((session, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Session ${index + 1}: ${session.first_name} ${session.last_name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`ID: ${session.id}`);
    console.log(`Email: ${session.email}`);
    console.log(`Created: ${session.created_at}`);
    console.log(`Channel: ${session.verification_channel}`);

    // Parse SDK Source
    if (session.sdk_source) {
      try {
        const source = typeof session.sdk_source === 'string'
          ? JSON.parse(session.sdk_source)
          : session.sdk_source;

        console.log(`\n📱 SDK Source:`);
        console.log(`   SDK Type: ${source.sdkType}`);
        console.log(`   SDK Version: ${source.sdkVersion}`);
        console.log(`   Device Platform: ${source.devicePlatform}`);
        console.log(`   JTI: ${source.jti}`);
        console.log(`   Session ID: ${source.sessionId || 'N/A'}`);
      } catch (e) {
        console.log('⚠️  Error parsing sdk_source:', e.message);
      }
    }

    // Parse SDK Analytics (TRACE EVENTS)
    if (session.sdk_analytics) {
      try {
        const analytics = typeof session.sdk_analytics === 'string'
          ? JSON.parse(session.sdk_analytics)
          : session.sdk_analytics;

        console.log(`\n📊 SDK Analytics (Trace Events):`);

        if (Array.isArray(analytics)) {
          // Analytics is the trace array directly
          console.log(`   Total Events: ${analytics.length}`);

          if (analytics.length > 0) {
            let totalDuration = 0;
            console.log(`\n   Event Breakdown:`);
            analytics.forEach((event, i) => {
              const duration = event.duration || 0;
              totalDuration += duration;
              console.log(`   ${i + 1}. ${event.name || event.type} - ${event.status} (${duration}ms)`);
            });
            console.log(`\n   ⏱️  Total Duration: ${totalDuration}ms (${Math.round(totalDuration / 1000)}s)`);
          } else {
            console.log('   ⚠️  Array is empty - no trace events!');
          }
        } else if (analytics.events && Array.isArray(analytics.events)) {
          // Analytics is an object with events property
          console.log(`   Total Events: ${analytics.events.length}`);

          if (analytics.events.length > 0) {
            let totalDuration = 0;
            console.log(`\n   Event Breakdown:`);
            analytics.events.forEach((event, i) => {
              const duration = event.duration || 0;
              totalDuration += duration;
              console.log(`   ${i + 1}. ${event.name || event.type} - ${event.status} (${duration}ms)`);
            });
            console.log(`\n   ⏱️  Total Duration: ${totalDuration}ms (${Math.round(totalDuration / 1000)}s)`);
          } else {
            console.log('   ⚠️  events array is empty - no trace events!');
          }
        } else {
          console.log(`   ⚠️  Unexpected format:`, analytics);
        }
      } catch (e) {
        console.log('   ⚠️  Error parsing sdk_analytics:', e.message);
      }
    } else {
      console.log('\n📊 SDK Analytics: ❌ NULL or undefined');
    }

    // Parse SDK Verifications
    if (session.sdk_verifications) {
      try {
        const verifications = typeof session.sdk_verifications === 'string'
          ? JSON.parse(session.sdk_verifications)
          : session.sdk_verifications;

        console.log(`\n✅ SDK Verifications:`);
        console.log(`   Document Type: ${verifications.documentType || 'N/A'}`);
        console.log(`   Face Match Level: ${verifications.faceMatchLevel || 'N/A'}`);
        console.log(`   Liveness Level: ${verifications.livenessLevel || 'N/A'}`);
        console.log(`   MRZ Valid: ${verifications.mrzValid || 'N/A'}`);
        console.log(`   Document Valid: ${verifications.documentValid || 'N/A'}`);

        // Fraud detection scores
        if (verifications.idScreenDetection) {
          console.log(`   🔍 Screen Detection: ${verifications.idScreenDetection.score}/100`);
        }
        if (verifications.idPrintDetection) {
          console.log(`   🖨️  Print Detection: ${verifications.idPrintDetection.score}/100`);
        }
        if (verifications.idPhotoTamperingDetection) {
          console.log(`   📸 Photo Tampering: ${verifications.idPhotoTamperingDetection.score}/100`);
        }
      } catch (e) {
        console.log('   ⚠️  Error parsing sdk_verifications:', e.message);
      }
    } else {
      console.log('\n✅ SDK Verifications: ❌ NULL or undefined');
    }
  });

  console.log(`\n${'='.repeat(80)}\n`);
}

debugAndroidSession().catch(console.error);
