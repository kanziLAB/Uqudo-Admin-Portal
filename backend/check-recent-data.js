import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkRecentData() {
  console.log('🔍 Checking most recent data (last 2 hours)...\n');

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Check recent accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, first_name, last_name, created_at, sdk_analytics')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false });

  if (!accountsError && accounts) {
    console.log(`📊 Accounts created in last 2 hours: ${accounts.length}\n`);
    accounts.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.first_name} ${acc.last_name}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log(`   SDK Analytics: ${acc.sdk_analytics ? acc.sdk_analytics.length + ' events' : 'None'}`);
      if (acc.sdk_analytics && acc.sdk_analytics.length > 0) {
        acc.sdk_analytics.forEach(event => {
          console.log(`      - ${event.name}`);
        });
      }
      console.log('');
    });
  }

  // Check recent cases
  const { data: cases, error: casesError } = await supabase
    .from('aml_cases')
    .select('*')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false });

  if (!casesError && cases) {
    console.log(`\n🚨 AML Cases created in last 2 hours: ${cases.length}\n`);
    cases.forEach((case_, idx) => {
      console.log(`${idx + 1}. Case ID: ${case_.case_id}`);
      console.log(`   Created: ${case_.created_at}`);
      console.log(`   Match Count: ${case_.match_count}`);
      console.log(`   Match Details: ${case_.match_details ? 'Present ✅' : 'Missing ❌'}`);

      if (case_.match_details) {
        console.log(`   Match Details Content:`);
        console.log(JSON.stringify(case_.match_details, null, 2));
      }
      console.log('');
    });
  }

  // Check recent alerts
  const { data: alerts, error: alertsError } = await supabase
    .from('kyc_alerts')
    .select('id, alert_type, created_at')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false });

  if (!alertsError && alerts) {
    console.log(`\n⚠️  Alerts created in last 2 hours: ${alerts.length}\n`);
    alerts.forEach((alert, idx) => {
      console.log(`${idx + 1}. ${alert.alert_type} - ${alert.created_at}`);
    });
  }
}

checkRecentData().catch(console.error);
