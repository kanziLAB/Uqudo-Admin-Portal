import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kpmcigujptbolpdlfojo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please set it before running this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkUsers() {
  console.log('🔍 Checking users in database...\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, status, tenant_id')
    .eq('status', 'active');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Found ${users.length} active users:\n`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Tenant ID: ${user.tenant_id}`);
    console.log('');
  });

  // Check tenants too
  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, domain, status');

  if (!tenantError && tenants) {
    console.log(`\n📊 Tenants (${tenants.length}):\n`);
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.domain})`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   ID: ${tenant.id}`);
      console.log('');
    });
  }
}

checkUsers().catch(console.error);
