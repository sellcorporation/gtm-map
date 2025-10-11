import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/service';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe events with idempotency and service-role writes.
 * 
 * Events handled:
 * - checkout.session.completed → Create/upgrade subscription
 * - customer.subscription.updated → Update subscription status
 * - customer.subscription.deleted → Downgrade to Free
 * - invoice.paid → Record transaction
 * - invoice.payment_failed → Mark subscription as past_due
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('[WEBHOOK] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 1) Check idempotency (have we processed this event before?)
  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single();

  if (existingEvent) {
    console.log('[WEBHOOK] Event already processed:', event.id);
    return NextResponse.json({ received: true, skipped: true });
  }

  // 2) Record event (marks as processed)
  await supabaseAdmin
    .from('stripe_events')
    .insert({ id: event.id, received_at: new Date().toISOString() });

  // 3) Process event based on type
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Safeguard: only process subscription checkouts
        if (session.mode !== 'subscription') {
          return NextResponse.json({ received: true, skipped: true });
        }

        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(
          session.customer as string
        );
        const userId = (customer as Stripe.Customer).metadata.supabase_user_id;

        if (!userId) {
          console.error('[WEBHOOK] No user ID in customer metadata');
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Get price ID from subscription item
        const priceId = subscription.items.data[0]?.price.id;

        // Determine plan from price ID
        const { data: planData } = await supabaseAdmin
          .from('plan_prices')
          .select('plan_id')
          .eq('stripe_price_id', priceId)
          .single();

        const planId = planData?.plan_id || 'starter';

        // Update user subscription
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            status: 'active',
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq('user_id', userId);

        console.log(
          '[WEBHOOK] Subscription created:',
          userId,
          planId,
          subscription.id
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );
        const userId = (customer as Stripe.Customer).metadata.supabase_user_id;

        if (!userId) {
          console.error('[WEBHOOK] No user ID in customer metadata');
          break;
        }

        // Get price ID from subscription item
        const priceId = subscription.items.data[0]?.price.id;

        // Determine plan from price ID
        const { data: planData } = await supabaseAdmin
          .from('plan_prices')
          .select('plan_id')
          .eq('stripe_price_id', priceId)
          .single();

        const planId = planData?.plan_id || 'starter';

        // Update subscription
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            status: subscription.status === 'active' ? 'active' : subscription.status,
            stripe_price_id: priceId,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
          })
          .eq('user_id', userId);

        console.log('[WEBHOOK] Subscription updated:', userId, subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );
        const userId = (customer as Stripe.Customer).metadata.supabase_user_id;

        if (!userId) {
          console.error('[WEBHOOK] No user ID in customer metadata');
          break;
        }

        // Downgrade to free
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: 'free',
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        console.log('[WEBHOOK] Subscription canceled:', userId);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(
          invoice.customer as string
        );
        const userId = (customer as Stripe.Customer).metadata.supabase_user_id;

        if (!userId) {
          console.error('[WEBHOOK] No user ID in customer metadata');
          break;
        }

        // Record transaction
        await supabaseAdmin.from('billing_transactions').insert({
          user_id: userId,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'paid',
          invoice_pdf_url: invoice.invoice_pdf,
          billing_reason: invoice.billing_reason,
        });

        console.log('[WEBHOOK] Invoice paid:', userId, invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(
          invoice.customer as string
        );
        const userId = (customer as Stripe.Customer).metadata.supabase_user_id;

        if (!userId) {
          console.error('[WEBHOOK] No user ID in customer metadata');
          break;
        }

        // Mark subscription as past_due
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ status: 'past_due' })
          .eq('user_id', userId);

        console.log('[WEBHOOK] Payment failed:', userId, invoice.id);
        break;
      }

      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('[WEBHOOK] Processing error:', error);
    // Still return 200 to avoid Stripe retries
  }

  return NextResponse.json({ received: true });
}

