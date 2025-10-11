import { createClient } from '@supabase/supabase-js';

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
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

