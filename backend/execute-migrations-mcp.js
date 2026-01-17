import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration from .env.local
const supabaseUrl = 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function executeMigrations() {
  console.log('🚀 Starting database migrations...\n');

  // Read the combined migration file
  const migrationPath = path.join(__dirname, '..', 'COMBINED_MIGRATION.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded successfully\n');

  // Split into individual statements (more carefully this time)
  const lines = sql.split('\n');
  const statements = [];
  let currentStatement = '';
  let inComment = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and standalone comments
    if (!trimmedLine || trimmedLine.startsWith('--') || trimmedLine.match(/^={3,}$/)) {
      continue;
    }

    currentStatement += line + '\n';

    // If line ends with semicolon, it's a complete statement
    if (trimmedLine.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip if it's just whitespace
    if (!statement || statement.length < 10) {
      continue;
    }

    const preview = statement.substring(0, 100).replace(/\n/g, ' ').trim();
    console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Check if it's a "column already exists" error - that's OK
        if (error.message && error.message.includes('already exists')) {
          console.log(`   ℹ️  Column/index already exists (skipping)\n`);
          successCount++;
          results.push({ statement: preview, status: 'skipped', message: 'Already exists' });
        } else {
          console.log(`   ❌ Error: ${error.message}\n`);
          errorCount++;
          results.push({ statement: preview, status: 'error', message: error.message });
        }
      } else {
        console.log(`   ✅ Success\n`);
        successCount++;
        results.push({ statement: preview, status: 'success' });
      }
    } catch (err) {
      console.log(`   ⚠️  Exception: ${err.message}\n`);
      errorCount++;
      results.push({ statement: preview, status: 'error', message: err.message });
    }
  }

  console.log('=' .repeat(80));
  console.log(`\n📈 Migration Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${statements.length}\n`);

  // Verify the columns were added
  console.log('🔍 Verifying new columns...\n');

  try {
    const { data: columns, error: colError } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);

    if (colError) {
      console.log(`   ❌ Verification failed: ${colError.message}`);
      console.log(`   ℹ️  This might mean the columns weren't added. Check the errors above.\n`);
    } else {
      console.log('   ✅ Successfully connected to accounts table\n');

      // Check for specific columns
      const expectedColumns = [
        'sdk_source',
        'sdk_verifications',
        'sdk_documents',
        'sdk_analytics',
        'face_image_url',
        'face_image_base64',
        'document_front_url',
        'document_back_url',
        'images_fetched_at'
      ];

      // Try to fetch with these columns
      const { data: testData, error: testError } = await supabase
        .from('accounts')
        .select(expectedColumns.join(','))
        .limit(1);

      if (testError) {
        console.log(`   ⚠️  Some columns might be missing: ${testError.message}\n`);
      } else {
        console.log('   ✅ All expected columns are present!\n');
        console.log('   Expected columns:');
        expectedColumns.forEach(col => {
          console.log(`      - ${col}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 Migration process completed!\n');
    console.log('Next steps:');
    console.log('1. Add environment variables to Vercel (see VERCEL_ENV_VARIABLES.md)');
    console.log('2. Push code to GitHub to deploy');
    console.log('3. Test with a new SDK verification from mobile\n');

  } catch (err) {
    console.error('❌ Verification error:', err.message);
  }
}

// Run migrations
executeMigrations().catch(err => {
  console.error('\n❌ Fatal error during migration:', err.message);
  console.error(err.stack);
  process.exit(1);
});
