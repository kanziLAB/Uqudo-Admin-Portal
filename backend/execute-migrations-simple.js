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
  console.log('🚀 Starting database migrations using Supabase REST API...\n');

  // Read the combined migration file
  const migrationPath = path.join(__dirname, '..', 'COMBINED_MIGRATION.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded successfully\n');

  // Extract the ALTER TABLE statements and execute them one by one
  const migrations = [
    {
      name: 'Add SDK Analytics columns',
      sql: `
        ALTER TABLE accounts
        ADD COLUMN IF NOT EXISTS sdk_source JSONB,
        ADD COLUMN IF NOT EXISTS sdk_verifications JSONB,
        ADD COLUMN IF NOT EXISTS sdk_documents JSONB,
        ADD COLUMN IF NOT EXISTS sdk_analytics JSONB;
      `
    },
    {
      name: 'Add Face Images columns',
      sql: `
        ALTER TABLE accounts
        ADD COLUMN IF NOT EXISTS face_image_url TEXT,
        ADD COLUMN IF NOT EXISTS document_front_url TEXT,
        ADD COLUMN IF NOT EXISTS document_back_url TEXT,
        ADD COLUMN IF NOT EXISTS face_image_base64 TEXT,
        ADD COLUMN IF NOT EXISTS images_fetched_at TIMESTAMP WITH TIME ZONE;
      `
    },
    {
      name: 'Create SDK analytics index',
      sql: `CREATE INDEX IF NOT EXISTS idx_accounts_sdk_analytics ON accounts USING GIN (sdk_analytics);`
    },
    {
      name: 'Create images fetched index',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_accounts_images_fetched
        ON accounts(images_fetched_at)
        WHERE images_fetched_at IS NOT NULL;
      `
    }
  ];

  console.log(`📊 Executing ${migrations.length} migration steps\n`);

  let successCount = 0;
  let errorCount = 0;

  // Execute each migration using the REST API
  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];

    console.log(`[${i + 1}/${migrations.length}] ${migration.name}...`);

    try {
      // Use fetch to call the Supabase REST API directly with SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`
        },
        body: JSON.stringify({ query: migration.sql })
      });

      if (!response.ok) {
        const error = await response.text();
        // If the function doesn't exist, we need to execute SQL differently
        if (error.includes('Could not find') || response.status === 404) {
          console.log(`   ℹ️  REST RPC not available, trying alternative method...\n`);

          // Try using pg_catalog directly
          const pgResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceRoleKey,
              'Authorization': `Bearer ${supabaseServiceRoleKey}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ sql: migration.sql })
          });

          if (!pgResponse.ok) {
            console.log(`   ⚠️  Alternative method also failed. Manual execution required.\n`);
            errorCount++;
          } else {
            console.log(`   ✅ Success (alternative method)\n`);
            successCount++;
          }
        } else if (error.includes('already exists')) {
          console.log(`   ℹ️  Already exists (skipping)\n`);
          successCount++;
        } else {
          console.log(`   ❌ Error: ${error}\n`);
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

  // Verify the columns were added
  console.log('🔍 Verifying new columns...\n');

  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('sdk_source, sdk_analytics, face_image_url')
      .limit(1);

    if (error) {
      console.log(`   ⚠️  Verification query failed: ${error.message}`);
      console.log(`   ℹ️  Columns might not be added yet. See manual instructions below.\n`);
    } else {
      console.log(`   ✅ Successfully queried new columns!`);
      console.log(`   ✅ Migrations appear to be successful!\n`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 MANUAL MIGRATION INSTRUCTIONS\n');
    console.log('If the automated migration failed, please run the SQL manually:');
    console.log('\n1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select project: kpmcigujptbolpdlfojo');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the contents of COMBINED_MIGRATION.sql');
    console.log('5. Click "Run"\n');
    console.log('='.repeat(80));

    console.log('\n🎉 Migration process completed!\n');
    console.log('Next steps:');
    console.log('1. Verify columns exist in Supabase (see RUN_MIGRATIONS_GUIDE.md)');
    console.log('2. Add environment variables to Vercel (see VERCEL_ENV_VARIABLES.md)');
    console.log('3. Push code to GitHub to deploy');
    console.log('4. Test with a new SDK verification from mobile\n');

  } catch (err) {
    console.error('❌ Verification error:', err.message);
  }
}

// Run migrations
executeMigrations().catch(err => {
  console.error('\n❌ Fatal error during migration:', err.message);
  process.exit(1);
});
