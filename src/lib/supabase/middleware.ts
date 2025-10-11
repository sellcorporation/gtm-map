import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Creates a Supabase client for middleware operations
 * 
 * This is CRITICAL for auth to work correctly:
 * - Refreshes expired sessions
 * - Sets updated cookies on the response
 * - Must be called in middleware for every request
 * 
 * @param request - Next.js request object
 * @returns Tuple of [response, supabase client]
 */
export async function createClient(request: NextRequest) {
  // Create response (we'll modify it with new cookies)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // CRITICAL: This triggers session refresh if needed
  // Without this, expired sessions won't be refreshed
  await supabase.auth.getUser();

  return { response, supabase };
}

