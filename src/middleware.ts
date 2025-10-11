import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

/**
 * Middleware for authentication and session management
 * 
 * This middleware:
 * 1. Refreshes expired sessions automatically
 * 2. Protects routes that require authentication
 * 3. Redirects unauthenticated users to login
 * 
 * CRITICAL: This must run for ALL requests to ensure session refresh works
 */
export async function middleware(request: NextRequest) {
  const { response, supabase } = await createClient(request);

  // Get current user (triggers session refresh if needed)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes (don't require auth)
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    // Redirect to login
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return Response.redirect(redirectUrl);
  }

  // If user IS authenticated and trying to access auth pages
  if (user && isPublicRoute && request.nextUrl.pathname !== '/auth/callback') {
    // Redirect to home
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return Response.redirect(redirectUrl);
  }

  // Return response with updated cookies
  return response;
}

/**
 * Configure which routes the middleware should run on
 * 
 * Run on all routes EXCEPT:
 * - API routes (auth endpoints handle their own session)
 * - Static files (_next/static, _next/image)
 * - Favicon and public files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - they handle auth themselves)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

