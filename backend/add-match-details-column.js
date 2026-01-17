import pg from 'pg';
const { Client } = pg;

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

async function addMatchDetailsColumn() {
  console.log('🚀 Adding match_details column to aml_cases table...\n');

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Add the column
    console.log('📝 Adding match_details column...');
    await client.query(`
      ALTER TABLE aml_cases
      ADD COLUMN IF NOT EXISTS match_details JSONB DEFAULT NULL;
    `);
    console.log('✅ Column added successfully\n');

    // Add comment
    console.log('📝 Adding column comment...');
    await client.query(`
      COMMENT ON COLUMN aml_cases.match_details IS 'JSONB column storing detailed match information including matched_entities array, match_count, and highest_risk_score';
    `);
    console.log('✅ Comment added\n');

    // Create index
    console.log('📝 Creating GIN index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_aml_cases_match_details ON aml_cases USING GIN (match_details);
    `);
    console.log('✅ Index created\n');

    // Verify
    console.log('🔍 Verifying column exists...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'aml_cases' AND column_name = 'match_details';
    `);

    if (result.rows.length > 0) {
      console.log('✅ Column verified:');
      console.log(`   Name: ${result.rows[0].column_name}`);
      console.log(`   Type: ${result.rows[0].data_type}`);
      console.log(`   Nullable: ${result.rows[0].is_nullable}`);
    } else {
      console.log('❌ Column not found!');
    }

    await client.end();
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addMatchDetailsColumn().catch(console.error);
