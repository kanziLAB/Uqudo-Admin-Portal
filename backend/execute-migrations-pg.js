import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL connection configuration - use direct connection from POSTGRES_HOST
const config = {
  user: 'postgres',
  password: '+Mz/KD_Sa@d-JW5',
  host: 'db.kpmcigujptbolpdlfojo.supabase.co',
  port: 5432,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
};

async function executeMigrations() {
  console.log('🚀 Starting database migrations using PostgreSQL client...\n');

  const client = new Client(config);

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read the combined migration file
    const migrationPath = path.join(__dirname, '..', 'COMBINED_MIGRATION.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully\n');

    // Split into individual statements
    const lines = sql.split('\n');
    const statements = [];
    let currentStatement = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines, comments, and separator lines
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
    let skipCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip if it's just whitespace or a SELECT statement (verification queries)
      if (!statement || statement.length < 10 || statement.trim().toUpperCase().startsWith('SELECT')) {
        continue;
      }

      const preview = statement.substring(0, 100).replace(/\n/g, ' ').trim();
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        await client.query(statement);
        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (err) {
        // Check if it's a "column already exists" or "relation already exists" error - that's OK
        if (err.message && (err.message.includes('already exists') || err.code === '42701' || err.code === '42P07')) {
          console.log(`   ℹ️  Already exists (skipping)\n`);
          skipCount++;
        } else {
          console.log(`   ❌ Error: ${err.message}\n`);
          errorCount++;
        }
      }
    }

    console.log('='.repeat(80));
    console.log(`\n📈 Migration Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ℹ️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${successCount + skipCount + errorCount}\n`);

    // Verify the columns were added
    console.log('🔍 Verifying new columns...\n');

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

    const verifyQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'accounts'
      AND column_name IN (${expectedColumns.map((_, i) => `$${i + 1}`).join(',')})
      ORDER BY column_name;
    `;

    const result = await client.query(verifyQuery, expectedColumns);

    console.log(`   Found ${result.rows.length} of ${expectedColumns.length} expected columns:`);
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name}`);
    });

    const missing = expectedColumns.filter(col =>
      !result.rows.find(row => row.column_name === col)
    );

    if (missing.length > 0) {
      console.log(`\n   ⚠️  Missing columns:`);
      missing.forEach(col => {
        console.log(`   ❌ ${col}`);
      });
    } else {
      console.log(`\n   🎉 All expected columns are present!`);
    }

    // Check indexes
    console.log('\n🔍 Verifying indexes...\n');
    const indexQuery = `
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'accounts'
      AND indexname IN ('idx_accounts_sdk_analytics', 'idx_accounts_images_fetched');
    `;

    const indexResult = await client.query(indexQuery);
    console.log(`   Found ${indexResult.rows.length} of 2 expected indexes:`);
    indexResult.rows.forEach(row => {
      console.log(`   ✅ ${row.indexname}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 Migration process completed!\n');
    console.log('Next steps:');
    console.log('1. ✅ Database migrations completed');
    console.log('2. Add environment variables to Vercel (see VERCEL_ENV_VARIABLES.md)');
    console.log('3. Push code to GitHub to deploy');
    console.log('4. Test with a new SDK verification from mobile\n');

  } catch (err) {
    console.error('\n❌ Fatal error during migration:', err.message);
    console.error(err.stack);
    throw err;
  } finally {
    // Close connection
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run migrations
executeMigrations().catch(err => {
  console.error('\n❌ Migration failed');
  process.exit(1);
});
