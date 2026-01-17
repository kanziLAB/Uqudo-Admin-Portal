import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkWebSDKAccounts() {
  console.log('🔍 Checking for Web SDK accounts (last 24 hours)...\n');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Check all recent accounts
  const { data: allAccounts, error: allError } = await supabase
    .from('accounts')
    .select('*')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ Error fetching accounts:', allError.message);
    return;
  }

  console.log(`📊 Total accounts in last 24 hours: ${allAccounts.length}\n`);

  // Separate by channel
  const webAccounts = allAccounts.filter(acc => acc.verification_channel === 'web');
  const mobileAccounts = allAccounts.filter(acc => acc.verification_channel === 'mobile');
  const unknownAccounts = allAccounts.filter(acc => !acc.verification_channel);

  console.log('📱 Breakdown by channel:');
  console.log(`   Web SDK: ${webAccounts.length}`);
  console.log(`   Mobile SDK: ${mobileAccounts.length}`);
  console.log(`   Unknown/Legacy: ${unknownAccounts.length}\n`);

  if (webAccounts.length > 0) {
    console.log('✅ Web SDK Accounts:\n');
    webAccounts.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.first_name} ${acc.last_name}`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   User ID: ${acc.user_id}`);
      console.log(`   Email: ${acc.email}`);
      console.log(`   ID Number: ${acc.id_number || 'N/A'}`);
      console.log(`   Verification Type: ${acc.verification_type || 'N/A'}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log(`   Status: ${acc.account_status}`);
      console.log('');
    });
  } else {
    console.log('❌ No Web SDK accounts found in last 24 hours\n');
  }

  // Check for accounts without verification_channel (might be recent web submissions)
  if (unknownAccounts.length > 0) {
    console.log('⚠️  Accounts without verification_channel (might be recent):\n');
    unknownAccounts.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.first_name} ${acc.last_name}`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   User ID: ${acc.user_id}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log(`   SDK Source Type: ${acc.sdk_source?.sdkType || 'N/A'}`);
      console.log('');
    });
  }

  // Check very recent (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentAccounts, error: recentError } = await supabase
    .from('accounts')
    .select('*')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  if (!recentError && recentAccounts.length > 0) {
    console.log(`\n📍 Very recent accounts (last hour): ${recentAccounts.length}\n`);
    recentAccounts.forEach((acc, idx) => {
      const sdkType = acc.sdk_source?.sdkType || 'unknown';
      console.log(`${idx + 1}. ${acc.first_name} ${acc.last_name} - ${sdkType}`);
      console.log(`   Created: ${new Date(acc.created_at).toLocaleString()}`);
      console.log(`   Channel: ${acc.verification_channel || 'NOT SET'}`);
      console.log(`   Type: ${acc.verification_type || 'NOT SET'}`);
      console.log('');
    });
  } else {
    console.log('\n❌ No accounts created in the last hour');
  }
}

checkWebSDKAccounts().catch(console.error);
