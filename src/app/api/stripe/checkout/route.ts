import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/service';

/**
 * Stripe Checkout API Route
 * 
 * Creates a Stripe Checkout session for upgrading to Starter or Pro.
 */
export async function POST(request: NextRequest) {
  console.log('[CHECKOUT] ========== Starting Checkout ==========');
  
  try {
    // ========== Step 1: Environment Check ==========
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set');
    }
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      throw new Error('NEXT_PUBLIC_SITE_URL not set');
    }
    console.log('[CHECKOUT] ✓ Environment variables present');

    // ========== Step 2: Get Cookies ==========
    console.log('[CHECKOUT] Getting cookies...');
    const cookieStore = await cookies();
    console.log('[CHECKOUT] ✓ Cookies obtained');

    // ========== Step 3: Create Supabase Client ==========
    console.log('[CHECKOUT] Creating Supabase client...');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    console.log('[CHECKOUT] ✓ Supabase client created');

    // ========== Step 4: Authenticate User ==========
    console.log('[CHECKOUT] Authenticating user...');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('[CHECKOUT] ✗ Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('[CHECKOUT] ✗ No user found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[CHECKOUT] ✓ User authenticated:', user.email);

    // ========== Step 5: Get Plan from Request ==========
    console.log('[CHECKOUT] Parsing request body...');
    const body = await request.json();
    const { plan } = body;

    if (!plan) {
      console.error('[CHECKOUT] ✗ No plan in request');
      return NextResponse.json({ error: 'Missing plan parameter' }, { status: 400 });
    }

    if (!['starter', 'pro'].includes(plan)) {
      console.error('[CHECKOUT] ✗ Invalid plan:', plan);
      return NextResponse.json({ error: `Invalid plan: ${plan}` }, { status: 400 });
    }

    console.log('[CHECKOUT] ✓ Plan requested:', plan);

    // ========== Step 6: Get User Subscription ==========
    console.log('[CHECKOUT] Fetching user subscription...');
    const { data: sub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('[CHECKOUT] ✗ Failed to fetch subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: subError.message },
        { status: 500 }
      );
    }

    console.log('[CHECKOUT] ✓ Subscription fetched:', sub ? 'exists' : 'null');

    // ========== Step 7: Get or Create Stripe Customer ==========
    let customerId = sub?.stripe_customer_id;
    console.log('[CHECKOUT] Existing Stripe customer:', customerId || 'none');

    if (!customerId) {
      console.log('[CHECKOUT] Creating new Stripe customer...');
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;
        console.log('[CHECKOUT] ✓ Created Stripe customer:', customerId);

        // Save customer ID using service role
        console.log('[CHECKOUT] Saving customer ID to database...');
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[CHECKOUT] ✗ Failed to save customer ID:', updateError);
          return NextResponse.json(
            { error: 'Failed to save customer', details: updateError.message },
            { status: 500 }
          );
        }
        console.log('[CHECKOUT] ✓ Customer ID saved to database');
      } catch (stripeError) {
        console.error('[CHECKOUT] ✗ Stripe customer creation failed:', stripeError);
        throw stripeError;
      }
    }

    // ========== Step 8: Get Price ID ==========
    console.log('[CHECKOUT] Fetching price for plan:', plan);
    const { data: priceData, error: priceError } = await supabase
      .from('plan_prices')
      .select('stripe_price_id')
      .eq('plan_id', plan)
      .eq('cadence', 'monthly')
      .single();

    if (priceError || !priceData) {
      console.error('[CHECKOUT] ✗ Price not found:', priceError);
      return NextResponse.json(
        { error: 'Plan not configured', details: priceError?.message },
        { status: 500 }
      );
    }

    console.log('[CHECKOUT] ✓ Price found:', priceData.stripe_price_id);

    // ========== Step 9: Create Checkout Session ==========
    console.log('[CHECKOUT] Creating Stripe checkout session...');
    try {
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
        billing_address_collection: 'required',
        automatic_tax: { enabled: true },
        locale: 'auto',
        metadata: {
          supabase_user_id: user.id,
          plan_id: plan,
        },
      });

      console.log('[CHECKOUT] ✓ Session created:', session.id);
      console.log('[CHECKOUT] ✓ Checkout URL:', session.url);
      console.log('[CHECKOUT] ========== Checkout Success ==========');

      return NextResponse.json({ url: session.url });
    } catch (stripeError) {
      console.error('[CHECKOUT] ✗ Stripe session creation failed:', stripeError);
      throw stripeError;
    }
  } catch (error) {
    console.error('[CHECKOUT] ========== FATAL ERROR ==========');
    console.error('[CHECKOUT] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[CHECKOUT] Error message:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('[CHECKOUT] Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      {
        error: 'Checkout failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 }
    );
  }
}
