import Stripe from 'stripe';

/**
 * Stripe Client (Server-side only)
 * 
 * Pinned to stable API version: 2025-09-30
 * 
 * ⚠️ NEVER import this in client components
 * 
 * Lazy-loaded getter to prevent build-time initialization
 */
let _stripe: Stripe | null = null;

function getStripeInstance(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Export as a getter property to lazy-load
export const stripe = new Proxy({} as Stripe, {
  get: (_target, prop) => {
    const instance = getStripeInstance();
    const value = instance[prop as keyof Stripe];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

