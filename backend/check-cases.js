import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkCases() {
  console.log('🔍 Checking recent AML cases...\\n');

  const { data: cases, error } = await supabase
    .from('aml_cases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Found ${cases.length} recent cases:\\n`);
  cases.forEach((case_, index) => {
    console.log(`Case ${index + 1}:`);
    console.log(`  Case ID: ${case_.case_id}`);
    console.log(`  Status: ${case_.resolution_status}`);
    console.log(`  Match Count: ${case_.match_count}`);
    console.log(`  Created: ${case_.created_at}`);
    console.log(`  Match Details: ${case_.match_details ? 'Present' : 'Missing'}`);

    if (case_.match_details) {
      console.log(`  Match Details Content:`);
      console.log(JSON.stringify(case_.match_details, null, 2));
    }
    console.log('');
  });

  // Check accounts with sdk_analytics
  console.log('\\n🔍 Checking accounts with SDK analytics...\\n');

  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, first_name, last_name, sdk_analytics, created_at')
    .not('sdk_analytics', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  if (accountsError) {
    console.error('❌ Error:', accountsError.message);
    return;
  }

  console.log(`✅ Found ${accounts.length} accounts with SDK analytics:\\n`);
  accounts.forEach((account, index) => {
    console.log(`Account ${index + 1}: ${account.first_name} ${account.last_name}`);
    console.log(`  Created: ${account.created_at}`);
    console.log(`  SDK Analytics Events: ${account.sdk_analytics?.length || 0}`);

    if (account.sdk_analytics && account.sdk_analytics.length > 0) {
      console.log(`  Events:`);
      account.sdk_analytics.forEach(event => {
        console.log(`    - ${event.name} (${event.type}): ${event.status}`);
      });
    }
    console.log('');
  });
}

checkCases().catch(console.error);
