import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

/**
 * Simplified Checkout - No automatic tax for testing
 */
export async function POST(request: NextRequest) {
  console.log('[CHECKOUT-SIMPLE] Starting...');
  
  try {
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CHECKOUT-SIMPLE] User:', user.email);

    // Get plan from request
    const { plan } = await request.json();
    console.log('[CHECKOUT-SIMPLE] Plan:', plan);

    // Hardcode price IDs for testing
    const priceId = plan === 'starter' 
      ? 'price_1SHAhF2NFEywlXB6X3XqISK9' 
      : 'price_1SHAhQ2NFEywlXB6RO5wP7ia';

    console.log('[CHECKOUT-SIMPLE] Creating checkout session...');

    // Create simple checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?canceled=true`,
      customer_email: user.email,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    console.log('[CHECKOUT-SIMPLE] Session created:', session.id);
    console.log('[CHECKOUT-SIMPLE] URL:', session.url);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[CHECKOUT-SIMPLE] Error:', error);
    return NextResponse.json({
      error: 'Failed',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}

