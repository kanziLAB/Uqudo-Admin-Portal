import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:%2BMz%2FKD_Sa%40d-JW5@db.kpmcigujptbolpdlfojo.supabase.co:5432/postgres';

async function checkSchema() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'kyc_alerts'
      ORDER BY ordinal_position
    `);

    console.log('kyc_alerts table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
