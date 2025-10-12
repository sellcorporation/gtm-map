import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client (Service Role)
 * 
 * ⚠️ WARNING: This client bypasses Row Level Security (RLS)
 * 
 * Use ONLY for:
 * - Billing/subscription writes (users are read-only)
 * - Webhook handlers (Stripe events)
 * - Usage counter increments (atomic RPCs)
 * 
 * NEVER expose this client to the browser or client components!
 * 
 * Lazy-loaded to prevent build-time initialization
 */
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdminInstance(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for Supabase admin client');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for Supabase admin client');
    }
    
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return _supabaseAdmin;
}

// Export a Proxy that lazy-loads on first access
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseAdminInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

