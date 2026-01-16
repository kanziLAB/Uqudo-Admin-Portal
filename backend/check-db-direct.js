/**
 * Check database directly using PostgreSQL connection string
 */

import pkg from 'pg';
const { Client } = pkg;

// URL encode the password: +Mz/KD_Sa@d-JW5 becomes %2BMz%2FKD_Sa%40d-JW5
const connectionString = 'postgresql://postgres:%2BMz%2FKD_Sa%40d-JW5@db.kpmcigujptbolpdlfojo.supabase.co:5432/postgres';

async function checkDatabase() {
  console.log('='.repeat(70));
  console.log('  Checking Database Directly');
  console.log('='.repeat(70));
  console.log('');

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected to database');
    console.log('');

    // Check tables
    console.log('Checking if tables exist...');
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('tenants', 'users', 'accounts', 'kyc_alerts', 'aml_cases', 'blocklist', 'rules', 'countries', 'kyc_setup')
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);

    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found!');
      console.log('');
      console.log('The database schema has NOT been executed.');
      console.log('Please run the file: database/supabase_schema.sql');
      console.log('');
      console.log('Go to: https://supabase.com/dashboard/project/kpmcigujptbolpdlfojo/sql/new');
      console.log('Paste the contents of database/supabase_schema.sql and execute.');
      await client.end();
      return false;
    }

    console.log(`✓ Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    // Check counts
    console.log('Checking data...');

    const tenantsResult = await client.query('SELECT COUNT(*) FROM tenants');
    console.log(`  Tenants: ${tenantsResult.rows[0].count}`);

    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    console.log(`  Users: ${usersResult.rows[0].count}`);

    const accountsResult = await client.query('SELECT COUNT(*) FROM accounts');
    console.log(`  Accounts: ${accountsResult.rows[0].count}`);

    const alertsResult = await client.query('SELECT COUNT(*) FROM kyc_alerts');
    console.log(`  Alerts: ${alertsResult.rows[0].count}`);

    const casesResult = await client.query('SELECT COUNT(*) FROM aml_cases');
    console.log(`  Cases: ${casesResult.rows[0].count}`);
    console.log('');

    // Check for demo tenant
    const demoTenantResult = await client.query(
      "SELECT * FROM tenants WHERE domain = 'demo.uqudo.com' LIMIT 1"
    );

    if (demoTenantResult.rows.length === 0) {
      console.log('⚠️  Demo tenant not found');
      console.log('   Creating demo tenant and user...');
      console.log('');

      // Create demo tenant
      const tenantId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      await client.query(`
        INSERT INTO tenants (id, name, domain, status)
        VALUES ($1, 'Demo Tenant', 'demo.uqudo.com', 'active')
        ON CONFLICT (id) DO NOTHING
      `, [tenantId]);
      console.log('✓ Demo tenant created');

      // We need to hash password - for now, just notify user
      console.log('');
      console.log('⚠️  Demo user needs to be created with password hash');
      console.log('   Run: node create-user.js');
      console.log('   Then execute the SQL output in Supabase SQL Editor');
    } else {
      console.log('✓ Demo tenant exists:', demoTenantResult.rows[0].name);
    }

    // Check for demo user
    const demoUserResult = await client.query(
      "SELECT email, full_name, role, status FROM users WHERE email = 'admin@demo.uqudo.com' LIMIT 1"
    );

    if (demoUserResult.rows.length === 0) {
      console.log('⚠️  Demo user not found');
      console.log('   Run: node create-user.js');
    } else {
      console.log('✓ Demo user exists:');
      console.log('  Email:', demoUserResult.rows[0].email);
      console.log('  Name:', demoUserResult.rows[0].full_name);
      console.log('  Role:', demoUserResult.rows[0].role);
      console.log('  Status:', demoUserResult.rows[0].status);
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('  ✅ Database Check Complete');
    console.log('='.repeat(70));
    console.log('');

    await client.end();
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    return false;
  }
}

checkDatabase()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
