/**
 * Automatically insert demo user into database
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function insertDemoUser() {
  console.log('='.repeat(70));
  console.log('  Creating Demo User');
  console.log('='.repeat(70));
  console.log('');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Check if tenant exists
    console.log('Checking for demo tenant...');
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .single();

    let tenantId;

    if (existingTenant) {
      console.log('✓ Demo tenant already exists:', existingTenant.name);
      tenantId = existingTenant.id;
    } else {
      console.log('Creating demo tenant...');
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          name: 'Demo Tenant',
          domain: 'demo.uqudo.com',
          status: 'active'
        })
        .select()
        .single();

      if (tenantError) {
        console.log('❌ Error creating tenant:', tenantError.message);
        return false;
      }

      console.log('✓ Demo tenant created');
      tenantId = newTenant.id;
    }

    // Check if user exists
    console.log('');
    console.log('Checking for demo user...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('email', 'admin@demo.uqudo.com')
      .single();

    if (existingUser) {
      console.log('✓ Demo user already exists:', existingUser.email);
      console.log('');
      console.log('Demo User Credentials:');
      console.log('  Email: admin@demo.uqudo.com');
      console.log('  Password: Admin@123');
      console.log('');
      return true;
    }

    // Create password hash
    console.log('Generating password hash...');
    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log('✓ Password hash generated');

    // Insert user
    console.log('Creating demo user...');
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: 'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj',
        tenant_id: tenantId,
        email: 'admin@demo.uqudo.com',
        password_hash: passwordHash,
        full_name: 'Admin User',
        role: 'mlro',
        status: 'active',
        permissions: ['view_all', 'edit_all', 'delete_all', 'manage_users', 'manage_config']
      })
      .select()
      .single();

    if (userError) {
      console.log('❌ Error creating user:', userError.message);
      return false;
    }

    console.log('✓ Demo user created successfully!');
    console.log('');
    console.log('='.repeat(70));
    console.log('  ✅ Demo User Created!');
    console.log('='.repeat(70));
    console.log('');
    console.log('Demo User Credentials:');
    console.log('  Email: admin@demo.uqudo.com');
    console.log('  Password: Admin@123');
    console.log('  Role: MLRO (Full Access)');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start backend: npm run dev');
    console.log('  2. Open frontend: http://localhost:8080/pages/uqudo-sign-in.html');
    console.log('  3. Login with the credentials above');
    console.log('');

    return true;

  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

insertDemoUser()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
