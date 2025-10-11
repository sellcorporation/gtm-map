import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for server-side operations (Server Components, Route Handlers)
 * 
 * This client:
 * - Reads auth cookies from the request
 * - Can set new cookies (e.g., after auth state changes)
 * - Should be called in each Server Component/Route Handler that needs auth
 * 
 * @returns Supabase client instance
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component - can't set cookies
            // This is expected and will be handled by middleware
          }
        },
      },
    }
  );
}

