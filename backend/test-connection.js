/**
 * Test Supabase Connection
 * Quick script to verify your Supabase credentials are working
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testConnection() {
  console.log('='.repeat(70));
  console.log('  Testing Supabase Connection');
  console.log('='.repeat(70));
  console.log('');

  // Check environment variables
  console.log('Checking environment variables...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.log('❌ SUPABASE_URL is not set in .env file');
    return false;
  }
  console.log('✓ SUPABASE_URL:', supabaseUrl);

  if (!supabaseAnonKey) {
    console.log('❌ SUPABASE_ANON_KEY is not set in .env file');
    return false;
  }
  console.log('✓ SUPABASE_ANON_KEY: ', supabaseAnonKey.substring(0, 20) + '...');

  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env file');
    return false;
  }
  console.log('✓ SUPABASE_SERVICE_ROLE_KEY: ', supabaseServiceKey.substring(0, 20) + '...');

  console.log('');
  console.log('-'.repeat(70));
  console.log('  Testing Connection');
  console.log('-'.repeat(70));
  console.log('');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✓ Supabase client created');

    // Test 1: Check if we can connect
    console.log('');
    console.log('Test 1: Checking database connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);

    if (healthError) {
      console.log('❌ Failed to connect:', healthError.message);
      return false;
    }
    console.log('✓ Database connection successful');

    // Test 2: Check if tables exist
    console.log('');
    console.log('Test 2: Checking if tables exist...');

    const tables = ['tenants', 'users', 'accounts', 'kyc_alerts', 'aml_cases'];
    let allTablesExist = true;

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        console.log(`❌ Table '${table}' not found or not accessible`);
        console.log(`   Error: ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✓ Table '${table}' exists`);
      }
    }

    if (!allTablesExist) {
      console.log('');
      console.log('⚠️  Some tables are missing. Did you execute the schema?');
      console.log('   Go to Supabase → SQL Editor');
      console.log('   Run the file: database/supabase_schema.sql');
      return false;
    }

    // Test 3: Check if demo tenant exists
    console.log('');
    console.log('Test 3: Checking for demo tenant...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('domain', 'demo.uqudo.com')
      .single();

    if (tenantError || !tenant) {
      console.log('⚠️  Demo tenant not found');
      console.log('   Run: node create-user.js');
      console.log('   Then execute the SQL in Supabase');
    } else {
      console.log('✓ Demo tenant exists:', tenant.name);
      console.log('  ID:', tenant.id);
      console.log('  Status:', tenant.status);
    }

    // Test 4: Check if demo user exists
    console.log('');
    console.log('Test 4: Checking for demo user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.uqudo.com')
      .single();

    if (userError || !user) {
      console.log('⚠️  Demo user not found');
      console.log('   Run: node create-user.js');
      console.log('   Then execute the SQL in Supabase');
    } else {
      console.log('✓ Demo user exists');
      console.log('  Email:', user.email);
      console.log('  Name:', user.full_name);
      console.log('  Role:', user.role);
      console.log('  Status:', user.status);
    }

    // Test 5: Check account counts
    console.log('');
    console.log('Test 5: Checking data counts...');

    const { count: accountCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true });
    console.log(`  Accounts: ${accountCount || 0}`);

    const { count: alertCount } = await supabase
      .from('kyc_alerts')
      .select('*', { count: 'exact', head: true });
    console.log(`  Alerts: ${alertCount || 0}`);

    const { count: caseCount } = await supabase
      .from('aml_cases')
      .select('*', { count: 'exact', head: true });
    console.log(`  Cases: ${caseCount || 0}`);

    console.log('');
    console.log('='.repeat(70));
    console.log('  ✅ All Tests Passed!');
    console.log('='.repeat(70));
    console.log('');
    console.log('Your Supabase connection is working correctly.');
    console.log('');
    console.log('Next steps:');
    if (!user) {
      console.log('  1. Create demo user: node create-user.js');
    }
    console.log('  2. Start backend: npm run dev');
    console.log('  3. Test API: curl http://localhost:3000/health');
    console.log('  4. Open frontend: http://localhost:8080/pages/uqudo-sign-in.html');
    console.log('');

    return true;

  } catch (error) {
    console.log('');
    console.log('❌ Unexpected error:', error.message);
    console.log('');
    console.log('Common issues:');
    console.log('  - Check your SUPABASE_URL is correct');
    console.log('  - Verify your SUPABASE_SERVICE_ROLE_KEY is correct');
    console.log('  - Make sure your Supabase project is active');
    console.log('  - Check if Row Level Security is properly configured');
    console.log('');
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
