import { supabaseAdmin } from './config/supabase.js';

const sessionId = process.argv[2] || '16264e36-ca68-469f-88ac-ffd06720b0ea';

console.log('🔍 Searching for session:', sessionId);

async function checkSession() {
  // Get latest accounts
  const { data: latest, error } = await supabaseAdmin
    .from('accounts')
    .select('id, first_name, last_name, created_at, verification_channel, sdk_source, sdk_analytics, sdk_trace')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('\nLatest 15 accounts:\n');
  let found = false;
  let matchedAccount = null;

  if (latest) {
    latest.forEach((acc, i) => {
      const source = acc.sdk_source;
      const sessId = source?.sessionId || source?.jti || 'N/A';
      const isMatch = sessId === sessionId;
      if (isMatch) {
        found = true;
        matchedAccount = acc;
      }

      console.log(`${i+1}. ${isMatch ? '✅ MATCH' : ''} ${acc.first_name} ${acc.last_name}`);
      console.log(`   Channel: ${acc.verification_channel || 'unknown'}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log(`   Session: ${sessId}`);
      console.log(`   SDK Analytics: ${acc.sdk_analytics ? (Array.isArray(acc.sdk_analytics) ? acc.sdk_analytics.length + ' events' : typeof acc.sdk_analytics) : 'NULL'}`);
      console.log(`   SDK Trace: ${acc.sdk_trace ? (Array.isArray(acc.sdk_trace) ? acc.sdk_trace.length + ' events' : typeof acc.sdk_trace) : 'NULL'}`);
      console.log('');
    });
  }

  if (!found) {
    console.log('⚠️  Session ID not found in recent accounts!');
    console.log('   The submission may not have been saved to the database.');
  } else if (matchedAccount) {
    console.log('\n📋 Matched Account Details:');
    console.log('   ID:', matchedAccount.id);
    console.log('   SDK Source:', JSON.stringify(matchedAccount.sdk_source, null, 2));

    if (matchedAccount.sdk_analytics) {
      console.log('\n   SDK Analytics Events:');
      const analytics = matchedAccount.sdk_analytics;
      if (Array.isArray(analytics)) {
        analytics.forEach((e, i) => {
          console.log(`     ${i+1}. ${e.name || e.event || 'unknown'} - ${e.status || 'N/A'}`);
        });
      }
    }
  }

  // Also check sdk_trace_events table
  console.log('\n🔍 Checking sdk_trace_events table...');
  const { data: traces, error: traceErr } = await supabaseAdmin
    .from('sdk_trace_events')
    .select('*')
    .eq('session_id', sessionId)
    .limit(20);

  if (traceErr) {
    console.log('Trace table error:', traceErr.message);
  } else {
    console.log(`Found ${traces?.length || 0} trace events for this session`);
    if (traces && traces.length > 0) {
      traces.forEach(t => {
        console.log(`   - ${t.event_name} (${t.event_type}): ${t.event_status}`);
      });
    }
  }

  process.exit(0);
}

checkSession().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
