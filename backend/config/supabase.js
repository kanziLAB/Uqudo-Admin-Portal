import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase client for general operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

// Supabase admin client (bypasses RLS) - use carefully!
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Set tenant context for Row Level Security
 * @param {string} tenantId - UUID of the tenant
 * @returns {object} Supabase client with tenant context
 */
export function getSupabaseClientForTenant(tenantId) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      },
      global: {
        headers: {
          'x-tenant-id': tenantId
        }
      },
      db: {
        schema: 'public'
      }
    }
  );
}

/**
 * Execute query with tenant context
 * @param {string} tenantId - UUID of the tenant
 * @param {Function} queryFn - Function that executes the query
 */
export async function withTenantContext(tenantId, queryFn) {
  const { data, error } = await supabaseAdmin.rpc('set_tenant_context', {
    tenant_id: tenantId
  });

  if (error) {
    throw new Error(`Failed to set tenant context: ${error.message}`);
  }

  return await queryFn(supabaseAdmin);
}

export default supabase;
