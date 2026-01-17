import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkRecentAccounts() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  console.log('Checking accounts created in last 5 minutes...');
  console.log('5 minutes ago:', fiveMinutesAgo);
  console.log('Now:', new Date().toISOString());
  console.log('');

  const { data: last5min, error: error5min } = await supabase
    .from('accounts')
    .select('*')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (error5min) {
    console.error('Error fetching last 5 min:', error5min);
  } else {
    console.log(`✅ Accounts in last 5 minutes: ${last5min.length}`);
    if (last5min.length > 0) {
      last5min.forEach(acc => {
        console.log(`  - ID: ${acc.id}`);
        console.log(`    User ID: ${acc.user_id}`);
        console.log(`    Name: ${acc.first_name} ${acc.last_name}`);
        console.log(`    Email: ${acc.email}`);
        console.log(`    Channel: ${acc.verification_channel}`);
        console.log(`    Type: ${acc.verification_type}`);
        console.log(`    Created: ${acc.created_at}`);
        console.log('');
      });
    }
  }

  console.log('\nChecking accounts created in last hour...');
  const { data: lastHour, error: errorHour } = await supabase
    .from('accounts')
    .select('id, user_id, first_name, last_name, email, verification_channel, verification_type, created_at')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  if (errorHour) {
    console.error('Error fetching last hour:', errorHour);
  } else {
    console.log(`✅ Total accounts in last hour: ${lastHour.length}`);

    const webAccounts = lastHour.filter(acc => acc.verification_channel === 'web');
    const mobileAccounts = lastHour.filter(acc => acc.verification_channel === 'mobile');
    const unknownAccounts = lastHour.filter(acc => !acc.verification_channel);

    console.log(`   - Web SDK: ${webAccounts.length}`);
    console.log(`   - Mobile SDK: ${mobileAccounts.length}`);
    console.log(`   - Unknown channel: ${unknownAccounts.length}`);

    if (webAccounts.length > 0) {
      console.log('\n📱 Web SDK accounts:');
      webAccounts.forEach(acc => {
        console.log(`   - ${acc.email} (${acc.created_at})`);
      });
    }
  }
}

checkRecentAccounts().catch(console.error);
