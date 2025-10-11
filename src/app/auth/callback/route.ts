import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth callback route for email verification and OAuth
 * 
 * This route is called by Supabase after:
 * - Email verification link is clicked
 * - Password reset link is clicked
 * - OAuth login completes
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Successful - redirect to the next page or home
      return NextResponse.redirect(new URL(next, request.url));
    }
    
    // Error - redirect to login with error message
    return NextResponse.redirect(
      new URL('/login?error=Could not verify email', request.url)
    );
  }

  // No code provided - redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}

