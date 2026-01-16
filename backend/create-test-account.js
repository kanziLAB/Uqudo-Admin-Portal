import { supabaseAdmin } from './config/supabase.js';
import { randomUUID } from 'crypto';

async function createTestAccount() {
  const accountId = randomUUID();

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .insert({
      id: accountId,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      user_id: 'TEST-' + Date.now(),
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@test.com',
      phone_number: '+1234567890',
      date_of_birth: '1990-01-15',
      account_status: 'active',
      kyc_verification_status: 'pending',
      verification_channel: 'web',
      verification_type: 'full_kyc'
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } else {
    console.log(data.id);
  }
  process.exit(0);
}

createTestAccount();
