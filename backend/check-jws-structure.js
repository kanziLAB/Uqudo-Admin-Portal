import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkJWSStructure() {
  console.log('🔍 Checking what fields are available in stored account data...\\n');

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !accounts || accounts.length === 0) {
    console.error('No accounts found');
    return;
  }

  const account = accounts[0];

  console.log('📋 Available fields in account:');
  Object.keys(account).forEach(key => {
    const value = account[key];
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        console.log(`  ✅ ${key}: [Object with keys: ${Object.keys(value).join(', ')}]`);
      } else {
        console.log(`  ✅ ${key}: ${typeof value}`);
      }
    }
  });

  console.log('\\n🔍 Looking for trace/analytics/events fields...\\n');

  const analyticsFields = ['trace', 'analytics', 'events', 'sdk_analytics', 'sdk_trace'];
  analyticsFields.forEach(field => {
    if (account[field]) {
      console.log(`✅ Found ${field}:`);
      console.log(JSON.stringify(account[field], null, 2));
    } else {
      console.log(`❌ ${field}: Not present`);
    }
  });

  console.log('\\n🔍 Check if SDK source has any analytics fields...\\n');
  if (account.sdk_source) {
    console.log('SDK Source keys:', Object.keys(account.sdk_source));
  }
}

checkJWSStructure().catch(console.error);
