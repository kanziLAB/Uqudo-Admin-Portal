import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWNpZ3VqcHRib2xwZGxmb2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQyMDg2OSwiZXhwIjoyMDgzOTk2ODY5fQ.ffVADqxyYIivIn9U9OOaPeK8QnwyUIvz13_OHP_AT4M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  console.log('🚀 Executing database migrations...\\n');

  // Read the combined migration file
  const migrationPath = path.join(__dirname, '..', 'COMBINED_MIGRATION.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.includes('============'));

  console.log(`📊 Executing ${statements.length} SQL statements...\\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip if it's just a comment
    if (statement.startsWith('/*') || statement.length < 10) {
      continue;
    }

    const preview = statement.substring(0, 80).replace(/\\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      // For ALTER TABLE and CREATE INDEX, we need to use raw SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        console.log(`   ⚠️  ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
      errorCount++;
    }

    console.log('');
  }

  console.log(`\\n📈 Migration Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Warnings: ${errorCount}`);

  // Verify the migration
  console.log(`\\n🔍 Verifying columns...`);

  const { data, error } = await supabase
    .from('accounts')
    .select('sdk_source, sdk_analytics, face_image_url, face_image_base64')
    .limit(1);

  if (error) {
    console.log(`   ❌ Verification failed: ${error.message}`);
    console.log(`   ℹ️  You may need to run the SQL manually in Supabase SQL Editor`);
  } else {
    console.log(`   ✅ All columns verified!`);
    console.log(`\\n🎉 Migration completed successfully!`);
  }
}

executeMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
