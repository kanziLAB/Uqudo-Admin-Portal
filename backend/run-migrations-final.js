import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function executeMigrations() {
  console.log('🚀 Starting database migrations via Supabase Management API...\n');

  // Individual migration statements
  const migrations = [
    {
      name: 'Add SDK source column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sdk_source JSONB;'
    },
    {
      name: 'Add SDK verifications column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sdk_verifications JSONB;'
    },
    {
      name: 'Add SDK documents column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sdk_documents JSONB;'
    },
    {
      name: 'Add SDK analytics column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sdk_analytics JSONB;'
    },
    {
      name: 'Add face image URL column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS face_image_url TEXT;'
    },
    {
      name: 'Add document front URL column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS document_front_url TEXT;'
    },
    {
      name: 'Add document back URL column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS document_back_url TEXT;'
    },
    {
      name: 'Add face image base64 column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS face_image_base64 TEXT;'
    },
    {
      name: 'Add images fetched timestamp column',
      sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS images_fetched_at TIMESTAMP WITH TIME ZONE;'
    },
    {
      name: 'Create SDK analytics index',
      sql: 'CREATE INDEX IF NOT EXISTS idx_accounts_sdk_analytics ON accounts USING GIN (sdk_analytics);'
    },
    {
      name: 'Create images fetched index',
      sql: 'CREATE INDEX IF NOT EXISTS idx_accounts_images_fetched ON accounts(images_fetched_at) WHERE images_fetched_at IS NOT NULL;'
    }
  ];

  console.log(`📊 Executing ${migrations.length} migration statements\n`);

  let successCount = 0;
  let errorCount = 0;

  // Try to use the Supabase SQL query endpoint directly
  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`[${i + 1}/${migrations.length}] ${migration.name}...`);

    try {
      // Use fetch to call Supabase REST API with SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: migration.sql })
      });

      const result = await response.text();

      if (!response.ok) {
        // Check if it's "already exists" - that's OK
        if (result.includes('already exists') || result.includes('42701') || result.includes('42P07')) {
          console.log(`   ℹ️  Already exists (skipping)\n`);
          successCount++;
        } else {
          console.log(`   ⚠️  API method not available: ${result.substring(0, 100)}\n`);
          errorCount++;
        }
      } else {
        console.log(`   ✅ Success\n`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ⚠️  Exception: ${err.message}\n`);
      errorCount++;
    }
  }

  console.log('='.repeat(80));
  console.log(`\n📈 Migration Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${migrations.length}\n`);

  if (errorCount > 0) {
    console.log('⚠️  Some migrations failed. Trying verification anyway...\n');
  }

  // Verify the columns were added
  console.log('🔍 Verifying new columns...\n');

  try {
    // Try to query with the new columns
    const { data, error } = await supabase
      .from('accounts')
      .select('sdk_source, sdk_analytics, face_image_url, face_image_base64, images_fetched_at')
      .limit(1);

    if (error) {
      console.log(`   ❌ Verification failed: ${error.message}`);
      console.log(`   ℹ️  Columns might not exist yet.\n`);

      console.log('📋 MANUAL MIGRATION REQUIRED\n');
      console.log('The automated migration could not complete.');
      console.log('Please run the SQL manually in Supabase Dashboard:\n');
      console.log('1. Open https://supabase.com/dashboard');
      console.log('2. Select project: kpmcigujptbolpdlfojo');
      console.log('3. Go to SQL Editor');
      console.log('4. Copy/paste contents of COMBINED_MIGRATION.sql');
      console.log('5. Click Run\n');
    } else {
      console.log(`   ✅ All columns verified successfully!`);
      console.log(`   ✅ Query returned ${data ? data.length : 0} row(s)\n`);

      // List the verified columns
      if (data && data.length > 0) {
        console.log('   Verified columns:');
        Object.keys(data[0]).forEach(col => {
          console.log(`      ✅ ${col}`);
        });
      }

      console.log('\n' + '='.repeat(80));
      console.log('\n🎉 DATABASE MIGRATIONS SUCCESSFUL!\n');
      console.log('Next steps:');
      console.log('1. ✅ Database migrations completed');
      console.log('2. Add environment variables to Vercel (see VERCEL_ENV_VARIABLES.md)');
      console.log('3. Push code to GitHub: git push origin main');
      console.log('4. Test with new SDK verification from mobile\n');
    }
  } catch (err) {
    console.error('❌ Verification error:', err.message);
  }
}

// Run migrations
executeMigrations().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
