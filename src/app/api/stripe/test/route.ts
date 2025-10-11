import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify Stripe and environment setup
 */
export async function GET() {
  const checks = {
    stripe_key: !!process.env.STRIPE_SECRET_KEY,
    stripe_key_starts_with: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    site_url: process.env.NEXT_PUBLIC_SITE_URL,
  };

  return NextResponse.json({
    status: 'ok',
    checks,
    timestamp: new Date().toISOString(),
  });
}

