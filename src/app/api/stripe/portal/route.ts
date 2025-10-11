import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

/**
 * Stripe Customer Portal API Route
 * 
 * Creates a portal session for users to manage their subscriptions.
 * Users can:
 * - Cancel subscription
 * - Update payment method
 * - View invoices
 */
export async function POST(request: NextRequest) {
  console.log('[PORTAL] Creating customer portal session...');
  
  try {
    // 1. Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[PORTAL] Not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PORTAL] User authenticated:', user.email);

    // 2. Get user's Stripe customer ID
    const { data: sub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !sub?.stripe_customer_id) {
      console.error('[PORTAL] No Stripe customer found');
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    console.log('[PORTAL] Customer ID:', sub.stripe_customer_id);

    // 3. Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
    });

    console.log('[PORTAL] Portal session created:', session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[PORTAL] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create portal session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

