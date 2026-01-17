import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M';

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
