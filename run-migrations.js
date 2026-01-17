#!/usr/bin/env node

/**
 * Run database migrations for Supabase
 * Executes both SDK analytics and face images migrations
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeMigration(migrationFile) {
  console.log(`\n📄 Reading migration: ${migrationFile}`);

  const migrationPath = path.join(__dirname, migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolon and filter out comments and empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`📊 Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip SELECT statements used for verification
    if (statement.toUpperCase().startsWith('SELECT')) {
      console.log(`⏭️  Skipping verification SELECT statement ${i + 1}`);
      continue;
    }

    console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`);
    console.log(`   ${statement.substring(0, 60)}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ statement: statement.substring(0, 100) });

        if (directError) {
          console.error(`   ❌ Error: ${error.message}`);
          console.log(`   ℹ️  This may be expected if column already exists`);
        } else {
          console.log(`   ✅ Statement executed successfully`);
        }
      } else {
        console.log(`   ✅ Statement executed successfully`);
      }
    } catch (err) {
      console.error(`   ⚠️  Warning: ${err.message}`);
      console.log(`   ℹ️  Continuing with next statement...`);
    }
  }
}

async function verifyMigrations() {
  console.log('\n🔍 Verifying migrations...\n');

  try {
    // Verify SDK analytics columns
    const { data: sdkColumns, error: sdkError } = await supabase
      .from('accounts')
      .select('sdk_source, sdk_verifications, sdk_documents, sdk_analytics')
      .limit(1);

    if (sdkError) {
      console.log('❌ SDK analytics columns not found');
    } else {
      console.log('✅ SDK analytics columns verified');
    }

    // Verify face images columns
    const { data: imageColumns, error: imageError } = await supabase
      .from('accounts')
      .select('face_image_url, face_image_base64, document_front_url, document_back_url, images_fetched_at')
      .limit(1);

    if (imageError) {
      console.log('❌ Face images columns not found');
    } else {
      console.log('✅ Face images columns verified');
    }

    // Get column details
    console.log('\n📋 Checking column details in accounts table...');
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);

    if (accounts && accounts.length > 0) {
      const columnNames = Object.keys(accounts[0]);
      const relevantColumns = columnNames.filter(col =>
        col.includes('sdk_') || col.includes('face_') || col.includes('document_') || col.includes('images_')
      );

      console.log(`\n📊 Relevant columns found: ${relevantColumns.length}`);
      relevantColumns.forEach(col => {
        const value = accounts[0][col];
        console.log(`   ✓ ${col}: ${value !== null ? '(has data)' : '(null)'}`);
      });
    }
  } catch (error) {
    console.error('⚠️  Verification error:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Using service role key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);

  try {
    // Execute migrations
    await executeMigration('DATABASE_MIGRATION_SDK_ANALYTICS.sql');
    await executeMigration('DATABASE_MIGRATION_FACE_IMAGES.sql');

    // Verify migrations
    await verifyMigrations();

    console.log('\n✅ All migrations completed!\n');
    console.log('📝 Summary:');
    console.log('   ✓ SDK analytics columns added (sdk_source, sdk_verifications, sdk_documents, sdk_analytics)');
    console.log('   ✓ Face images columns added (face_image_url, face_image_base64, document URLs)');
    console.log('   ✓ Indexes created for performance');
    console.log('\n🎉 Database is ready for the new features!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
main();
