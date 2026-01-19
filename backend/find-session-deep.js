import { supabaseAdmin } from './config/supabase.js';

const sessionId = process.argv[2] || '16264e36-ca68-469f-88ac-ffd06720b0ea';

console.log('🔍 Deep search for session:', sessionId);

async function findSession() {
  // Get all recent accounts and search in all SDK fields
  const { data: accounts, error } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`\nSearching in ${accounts.length} recent accounts...\n`);

  let found = false;

  accounts.forEach((acc, i) => {
    // Convert all SDK fields to string and search
    const sdkSource = JSON.stringify(acc.sdk_source || {});
    const sdkAnalytics = JSON.stringify(acc.sdk_analytics || []);
    const sdkTrace = JSON.stringify(acc.sdk_trace || []);
    const sdkDocuments = JSON.stringify(acc.sdk_documents || []);
    const sdkVerifications = JSON.stringify(acc.sdk_verifications || []);

    const allData = sdkSource + sdkAnalytics + sdkTrace + sdkDocuments + sdkVerifications;

    if (allData.includes(sessionId) || allData.includes(sessionId.substring(0, 8))) {
      found = true;
      console.log(`✅ FOUND in account ${i+1}:`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Name: ${acc.first_name} ${acc.last_name}`);
      console.log(`   Channel: ${acc.verification_channel}`);
      console.log(`   Created: ${acc.created_at}`);

      // Show where it was found
      if (sdkSource.includes(sessionId)) console.log('   📍 Found in: sdk_source');
      if (sdkAnalytics.includes(sessionId)) console.log('   📍 Found in: sdk_analytics');
      if (sdkTrace.includes(sessionId)) console.log('   📍 Found in: sdk_trace');
      if (sdkDocuments.includes(sessionId)) console.log('   📍 Found in: sdk_documents');
      if (sdkVerifications.includes(sessionId)) console.log('   📍 Found in: sdk_verifications');

      // Show the SDK source
      console.log('\n   SDK Source:');
      const source = acc.sdk_source;
      if (source) {
        console.log(`     sdkType: ${source.sdkType}`);
        console.log(`     sdkVersion: ${source.sdkVersion}`);
        console.log(`     sessionId: ${source.sessionId || 'N/A'}`);
        console.log(`     jti: ${source.jti || 'N/A'}`);
        console.log(`     devicePlatform: ${source.devicePlatform || 'N/A'}`);
      }
    }
  });

  if (!found) {
    console.log('❌ Session ID not found anywhere in recent accounts.');
    console.log('\nPossible reasons:');
    console.log('1. The mobile SDK did not send the data to the webhook');
    console.log('2. The webhook URL was incorrect');
    console.log('3. There was a network error');
    console.log('4. The request failed validation');
    console.log('\nCheck Vercel logs for this timestamp: 2026-01-19T15:49:11.494Z');
  }

  // Also search in sdk_trace_events with partial match
  console.log('\n🔍 Searching sdk_trace_events with partial match...');
  const { data: traces } = await supabaseAdmin
    .from('sdk_trace_events')
    .select('session_id, jti, account_id, event_name, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (traces && traces.length > 0) {
    const matchingTraces = traces.filter(t =>
      t.session_id?.includes(sessionId.substring(0, 8)) ||
      t.jti?.includes(sessionId.substring(0, 8))
    );

    if (matchingTraces.length > 0) {
      console.log(`Found ${matchingTraces.length} matching trace events`);
      matchingTraces.forEach(t => {
        console.log(`   - ${t.event_name} (session: ${t.session_id}, account: ${t.account_id})`);
      });
    } else {
      console.log('No matching trace events found');
    }
  }

  process.exit(0);
}

findSession().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
