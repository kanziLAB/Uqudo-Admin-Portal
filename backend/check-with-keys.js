/**
 * Check Supabase connection using API keys
 * Run this after you provide the anon and service_role keys
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('='.repeat(70));
  console.log('  Supabase Connection Check');
  console.log('='.repeat(70));
  console.log('');
  console.log('Please provide your Supabase API keys.');
  console.log('Get them from: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/settings/api');
  console.log('');

  const anonKey = await question('Paste your anon/public key: ');
  const serviceKey = await question('Paste your service_role key: ');

  console.log('');
  console.log('Testing connection...');

  try {
    const supabase = createClient(
      'https://kpmcigujptbolpdlfojo.supabase.co',
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test connection
    const { data: tables, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Connection failed:', error.message);
      console.log('');
      console.log('Possible issues:');
      console.log('  - Incorrect API keys');
      console.log('  - Database schema not executed');
      console.log('  - Row Level Security blocking access');
      rl.close();
      return;
    }

    console.log('✓ Connected successfully!');
    console.log('');

    // Save keys to .env
    console.log('Updating .env file...');
    const fs = await import('fs');
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');

    envContent = envContent.replace(/SUPABASE_ANON_KEY=.*/g, `SUPABASE_ANON_KEY=${anonKey}`);
    envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);

    fs.writeFileSync(envPath, envContent);
    console.log('✓ .env file updated');
    console.log('');

    // Check tables
    const tablesToCheck = ['tenants', 'users', 'accounts', 'kyc_alerts', 'aml_cases'];
    console.log('Checking tables...');

    for (const table of tablesToCheck) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ✓ ${table}`);
      }
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('  ✅ Setup Complete!');
    console.log('='.repeat(70));
    console.log('');
    console.log('Next steps:');
    console.log('  1. Create demo user: node create-user.js');
    console.log('  2. Start backend: npm run dev');
    console.log('  3. Open frontend: http://localhost:8080/pages/uqudo-sign-in.html');
    console.log('');

    rl.close();

  } catch (error) {
    console.log('❌ Error:', error.message);
    rl.close();
  }
}

main();
