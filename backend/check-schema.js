import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkSchema() {
  console.log('🔍 Checking aml_cases table schema...\n');

  // Try to get table structure using information_schema
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'aml_cases'
      ORDER BY ordinal_position;
    `
  });

  if (error) {
    console.log('⚠️  RPC not available, trying direct query...\n');

    // Alternative: Just try to select all columns from a case
    const { data: sampleCase, error: caseError } = await supabase
      .from('aml_cases')
      .select('*')
      .limit(1)
      .single();

    if (caseError) {
      console.error('❌ Error:', caseError.message);
      return;
    }

    if (sampleCase) {
      console.log('✅ aml_cases table columns (from sample data):\n');
      Object.keys(sampleCase).forEach(col => {
        const value = sampleCase[col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${col}: ${type}`);
      });

      console.log('\n📊 match_details field:');
      console.log(`  Value: ${sampleCase.match_details ? 'Present' : 'NULL'}`);
      console.log(`  Type: ${typeof sampleCase.match_details}`);

      if (sampleCase.match_details) {
        console.log(`  Content:`, JSON.stringify(sampleCase.match_details, null, 2));
      }
    }
  } else {
    console.log('✅ Table structure:\n');
    data.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }

  // Test inserting a case with match_details
  console.log('\n🧪 Testing match_details insert...\n');

  const testPayload = {
    tenant_id: '00000000-0000-0000-0000-000000000001',
    account_id: '00000000-0000-0000-0000-000000000001',
    case_id: `TEST-${Date.now()}`,
    resolution_status: 'unsolved',
    match_count: 2,
    match_details: {
      matched_entities: [
        { name: 'Test Entity 1', risk_score: 90 },
        { name: 'Test Entity 2', risk_score: 85 }
      ],
      match_count: 2,
      highest_risk_score: 90
    }
  };

  console.log('Attempting to insert test case with match_details...');

  const { data: inserted, error: insertError } = await supabase
    .from('aml_cases')
    .insert(testPayload)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
  } else {
    console.log('✅ Insert successful!');
    console.log('   Case ID:', inserted.case_id);
    console.log('   Match Details:', inserted.match_details ? 'Present ✅' : 'NULL ❌');

    if (inserted.match_details) {
      console.log('   Content:', JSON.stringify(inserted.match_details, null, 2));
    }

    // Clean up test case
    await supabase
      .from('aml_cases')
      .delete()
      .eq('case_id', inserted.case_id);

    console.log('   (Test case cleaned up)');
  }
}

checkSchema().catch(console.error);
