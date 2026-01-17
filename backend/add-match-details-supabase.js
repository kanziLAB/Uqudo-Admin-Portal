import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function addMatchDetailsColumn() {
  console.log('🚀 Adding match_details column via Supabase SQL Editor...\n');
  console.log('Please run the following SQL in Supabase SQL Editor:\n');
  console.log('-----------------------------------------------------------');
  console.log(`
-- Add match_details column to aml_cases table
ALTER TABLE aml_cases
ADD COLUMN IF NOT EXISTS match_details JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN aml_cases.match_details IS 'JSONB column storing detailed match information';

-- Create index
CREATE INDEX IF NOT EXISTS idx_aml_cases_match_details ON aml_cases USING GIN (match_details);
  `);
  console.log('-----------------------------------------------------------\n');
  console.log('Steps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/sql/new');
  console.log('2. Paste the SQL above');
  console.log('3. Click "Run" button');
  console.log('4. Come back and run this script again to verify\n');

  console.log('Press Ctrl+C to exit, or wait to verify...\n');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🔍 Checking if column exists...\n');

  // Try to query a case to see if match_details field is available
  const { data, error } = await supabase
    .from('aml_cases')
    .select('id, match_details')
    .limit(1)
    .single();

  if (error) {
    if (error.message.includes('match_details')) {
      console.log('❌ Column does NOT exist yet');
      console.log('   Please run the SQL in Supabase SQL Editor');
    } else {
      console.log('⚠️  Other error:', error.message);
    }
  } else {
    console.log('✅ Column EXISTS!');
    console.log(`   Test query successful, match_details: ${data.match_details ? 'has value' : 'is NULL'}`);
  }
}

addMatchDetailsColumn().catch(console.error);
