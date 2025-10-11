import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for client-side operations (Client Components, browser JS)
 * 
 * This client:
 * - Uses document.cookie API automatically
 * - Handles session refresh automatically
 * - Singleton pattern (one instance per page)
 * 
 * @returns Supabase client instance
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

