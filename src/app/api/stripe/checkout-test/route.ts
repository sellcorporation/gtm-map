import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Simplified checkout test - just checks auth and database access
 */
export async function POST(request: NextRequest) {
  console.log('[CHECKOUT-TEST] Starting...');
  
  try {
    // Step 1: Test cookies
    console.log('[CHECKOUT-TEST] Step 1: Getting cookies...');
    const cookieStore = await cookies();
    console.log('[CHECKOUT-TEST] Cookies obtained');

    // Step 2: Test Supabase client
    console.log('[CHECKOUT-TEST] Step 2: Creating Supabase client...');
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
    console.log('[CHECKOUT-TEST] Supabase client created');

    // Step 3: Test auth
    console.log('[CHECKOUT-TEST] Step 3: Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('[CHECKOUT-TEST] Auth error:', authError);
      return NextResponse.json({ step: 'auth', error: authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('[CHECKOUT-TEST] No user found');
      return NextResponse.json({ step: 'auth', error: 'No user' }, { status: 401 });
    }
    
    console.log('[CHECKOUT-TEST] User found:', user.email);

    // Step 4: Test database query
    console.log('[CHECKOUT-TEST] Step 4: Querying user_subscriptions...');
    const { data: sub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('[CHECKOUT-TEST] Subscription query error:', subError);
      return NextResponse.json({ step: 'database', error: subError.message }, { status: 500 });
    }

    console.log('[CHECKOUT-TEST] Subscription found:', sub);

    // Step 5: Test plan_prices query
    console.log('[CHECKOUT-TEST] Step 5: Querying plan_prices...');
    const { data: prices, error: priceError } = await supabase
      .from('plan_prices')
      .select('*')
      .eq('plan_id', 'starter')
      .eq('cadence', 'monthly');

    if (priceError) {
      console.error('[CHECKOUT-TEST] Price query error:', priceError);
      return NextResponse.json({ step: 'prices', error: priceError.message }, { status: 500 });
    }

    console.log('[CHECKOUT-TEST] Prices found:', prices);

    return NextResponse.json({
      success: true,
      user: { email: user.email, id: user.id },
      subscription: sub,
      prices,
    });
  } catch (error) {
    console.error('[CHECKOUT-TEST] Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

