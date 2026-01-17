import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkLatestAccount() {
  console.log('🔍 Checking latest account data...\\n');

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (accounts.length === 0) {
    console.log('No accounts found');
    return;
  }

  const account = accounts[0];

  console.log(`📋 Latest Account: ${account.first_name} ${account.last_name}`);
  console.log(`   ID: ${account.id}`);
  console.log(`   Created: ${account.created_at}`);
  console.log('');

  console.log('📊 SDK Source:');
  console.log(JSON.stringify(account.sdk_source, null, 2));
  console.log('');

  console.log('📊 SDK Verifications:');
  console.log(JSON.stringify(account.sdk_verifications, null, 2));
  console.log('');

  console.log('📊 SDK Documents:');
  console.log(JSON.stringify(account.sdk_documents, null, 2));
  console.log('');

  console.log('📊 SDK Analytics:');
  console.log(JSON.stringify(account.sdk_analytics, null, 2));
  console.log('');

  console.log('🔍 Background Check Data:');
  console.log(JSON.stringify(account.background_check_data, null, 2));
}

checkLatestAccount().catch(console.error);
