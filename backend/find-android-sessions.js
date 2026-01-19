// Find all Android/Mobile SDK sessions
import { supabaseAdmin } from './config/supabase.js';

async function findAndroidSessions() {
  console.log('🔍 Searching for Android/Mobile SDK sessions...\n');

  // Get all sessions with verification_channel = 'mobile'
  const { data: sessions, error } = await supabaseAdmin
    .from('accounts')
    .select('id, first_name, last_name, email, created_at, verification_channel, sdk_source, sdk_analytics')
    .eq('verification_channel', 'mobile')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (sessions.length === 0) {
    console.log('⚠️  No mobile/Android sessions found with verification_channel = "mobile"');
    console.log('\n🔍 Searching by SDK Type in sdk_source instead...\n');

    // Try searching by sdk_source content
    const { data: allSessions, error: allError } = await supabaseAdmin
      .from('accounts')
      .select('id, first_name, last_name, email, created_at, verification_channel, sdk_source, sdk_analytics')
      .not('sdk_source', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (allError) {
      console.error('❌ Error:', allError);
      return;
    }

    const androidSessions = allSessions.filter(session => {
      if (!session.sdk_source) return false;
      try {
        const source = typeof session.sdk_source === 'string'
          ? JSON.parse(session.sdk_source)
          : session.sdk_source;

        const sdkType = (source.sdkType || '').toLowerCase();
        return sdkType.includes('android') || sdkType.includes('mobile') || sdkType.includes('ios');
      } catch (e) {
        return false;
      }
    });

    if (androidSessions.length === 0) {
      console.log('❌ No Android/Mobile sessions found at all!');
      console.log('\nAll sessions appear to be Web SDK or have no SDK data.');
      return;
    }

    console.log(`✅ Found ${androidSessions.length} Android/Mobile sessions:\n`);
    displaySessions(androidSessions);
  } else {
    console.log(`✅ Found ${sessions.length} mobile sessions:\n`);
    displaySessions(sessions);
  }
}

function displaySessions(sessions) {
  sessions.forEach((session, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Session ${index + 1}: ${session.first_name} ${session.last_name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`ID: ${session.id}`);
    console.log(`Email: ${session.email}`);
    console.log(`Created: ${session.created_at}`);
    console.log(`Channel: ${session.verification_channel || 'N/A'}`);

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
        console.log(`   JTI: ${source.jti || 'N/A'}`);
      } catch (e) {
        console.log('⚠️  Error parsing sdk_source');
      }
    }

    // Parse SDK Analytics
    if (session.sdk_analytics) {
      try {
        const analytics = typeof session.sdk_analytics === 'string'
          ? JSON.parse(session.sdk_analytics)
          : session.sdk_analytics;

        if (Array.isArray(analytics)) {
          const totalDuration = analytics.reduce((sum, event) => sum + (event.duration || 0), 0);
          console.log(`\n📊 Analytics: ${analytics.length} events, ${Math.round(totalDuration / 1000)}s total`);
        } else if (analytics.events) {
          const totalDuration = analytics.events.reduce((sum, event) => sum + (event.duration || 0), 0);
          console.log(`\n📊 Analytics: ${analytics.events.length} events, ${Math.round(totalDuration / 1000)}s total`);
        }
      } catch (e) {
        console.log('⚠️  Error parsing sdk_analytics');
      }
    } else {
      console.log('\n📊 Analytics: ❌ None');
    }
  });

  console.log(`\n${'='.repeat(80)}\n`);
}

findAndroidSessions().then(() => process.exit(0)).catch(console.error);
