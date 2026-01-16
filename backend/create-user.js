/**
 * Helper script to create a password hash for demo user
 * Usage: node create-user.js
 */

import bcrypt from 'bcryptjs';

async function createPasswordHash(password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

async function generateUser() {
  console.log('='.repeat(60));
  console.log('Uqudo Admin Portal - User Creation Helper');
  console.log('='.repeat(60));

  const password = 'Admin@123';
  const hash = await createPasswordHash(password);

  console.log('\nDemo User Credentials:');
  console.log('Email:', 'admin@demo.uqudo.com');
  console.log('Password:', password);
  console.log('\nPassword Hash (copy this to SQL):');
  console.log(hash);

  console.log('\n\nSQL to create demo user:');
  console.log('='.repeat(60));
  console.log(`
-- Create demo tenant
INSERT INTO tenants (id, name, domain, status)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'Demo Tenant',
  'demo.uqudo.com',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Create demo admin user
INSERT INTO users (
  id,
  tenant_id,
  email,
  password_hash,
  full_name,
  role,
  status,
  permissions
)
VALUES (
  'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'admin@demo.uqudo.com',
  '${hash}',
  'Admin User',
  'mlro',
  'active',
  '["view_all", "edit_all", "delete_all", "manage_users", "manage_config"]'::jsonb
)
ON CONFLICT (email) DO NOTHING;
  `);
  console.log('='.repeat(60));

  console.log('\nInstructions:');
  console.log('1. Copy the SQL above');
  console.log('2. Go to Supabase → SQL Editor');
  console.log('3. Paste and run the SQL');
  console.log('4. Try logging in with the credentials above\n');
}

generateUser().catch(console.error);
