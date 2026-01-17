import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function verifyColumn() {
  console.log('🔍 Checking if match_details column exists at database level...\n');

  // Try using raw SQL through Supabase REST API
  const { data, error } = await supabase
    .from('aml_cases')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying table:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Sample case retrieved');
    console.log('📋 Available fields:');
    Object.keys(data[0]).forEach(key => {
      console.log(`   - ${key}`);
    });

    if ('match_details' in data[0]) {
      console.log('\n✅ match_details column EXISTS in the response!');
      console.log(`   Value: ${data[0].match_details ? JSON.stringify(data[0].match_details) : 'NULL'}`);
    } else {
      console.log('\n❌ match_details column NOT in the response');
      console.log('   This suggests the column does not exist or schema cache is stale');
    }
  }

  // Alternative: Try to explicitly select match_details
  console.log('\n🔍 Attempting to explicitly select match_details...\n');

  const { data: explicitData, error: explicitError } = await supabase
    .from('aml_cases')
    .select('id, case_id, match_details')
    .limit(1);

  if (explicitError) {
    console.error('❌ Error:', explicitError.message);
    if (explicitError.message.includes('match_details')) {
      console.log('   → Column does NOT exist in database');
    }
  } else {
    console.log('✅ Explicit select successful!');
    if (explicitData && explicitData.length > 0) {
      console.log(`   Case ID: ${explicitData[0].case_id}`);
      console.log(`   match_details: ${explicitData[0].match_details ? 'Present' : 'NULL'}`);
      console.log('\n✅ Column EXISTS and is queryable!');
    }
  }
}

verifyColumn().catch(console.error);
