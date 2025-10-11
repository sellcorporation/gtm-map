import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/service';

/**
 * Stripe Checkout API Route
 * 
 * Creates a Stripe Checkout session for upgrading to Starter or Pro.
 * 
 * Flow:
 * 1. Get authenticated user
 * 2. Fetch or create Stripe customer
 * 3. Get price ID for plan
 * 4. Create checkout session with automatic tax
 * 5. Redirect to Stripe Checkout
 */
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
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

  // 1) Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Get plan from request
  const { plan } = await request.json();

  if (!plan || !['starter', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  try {
    // 3) Get or create Stripe customer
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID (using service role to bypass RLS)
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[CHECKOUT] Failed to save customer ID:', updateError);
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        );
      }
    }

    // 4) Get price ID for plan
    const { data: priceData, error: priceError } = await supabase
      .from('plan_prices')
      .select('stripe_price_id')
      .eq('plan_id', plan)
      .eq('cadence', 'monthly')
      .single();

    if (priceError || !priceData) {
      console.error('[CHECKOUT] Price not found for plan:', plan, priceError);
      return NextResponse.json(
        { error: 'Plan configuration error' },
        { status: 500 }
      );
    }

    // 5) Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceData.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?canceled=true`,
      automatic_tax: { enabled: true },
      locale: 'auto',
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[CHECKOUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

