import { supabaseAdmin } from './config/supabase.js';

const tenantId = '456edf22-e887-4a32-b2e5-334bf902831f';

console.log('🔍 Checking tenant:', tenantId);

async function checkTenant() {
  // Check if tenant exists
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (tenantErr) {
    console.log('❌ Tenant lookup error:', tenantErr.message);
    console.log('   This might be why account creation fails!');
  } else if (tenant) {
    console.log('✅ Tenant found:', tenant.name || tenant.id);
  } else {
    console.log('❌ Tenant NOT found in database');
  }

  // Check accounts for this tenant
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from('accounts')
    .select('id, first_name, last_name, tenant_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (accErr) {
    console.log('\n❌ Accounts query error:', accErr.message);
  } else {
    console.log(`\n📋 Accounts for this tenant: ${accounts?.length || 0}`);
    if (accounts && accounts.length > 0) {
      accounts.forEach((acc, i) => {
        console.log(`   ${i+1}. ${acc.first_name} ${acc.last_name} - ${acc.created_at}`);
      });
    }
  }

  // Check what tenants exist
  const { data: allTenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .limit(10);

  console.log('\n📋 Existing tenants:');
  if (allTenants && allTenants.length > 0) {
    allTenants.forEach(t => {
      console.log(`   - ${t.id} (${t.name || 'no name'})`);
    });
  } else {
    console.log('   No tenants found');
  }

  // Check accounts table constraints
  console.log('\n🔍 Checking if tenant_id is required...');
  const { data: testAccount, error: testErr } = await supabaseAdmin
    .from('accounts')
    .select('id, tenant_id')
    .limit(1)
    .single();

  if (testAccount) {
    console.log('   Sample account tenant_id:', testAccount.tenant_id);
  }

  process.exit(0);
}

checkTenant().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
