import Stripe from 'stripe';

/**
 * Stripe Client (Server-side only)
 * 
 * Pinned to stable API version: 2023-10-16
 * 
 * ⚠️ NEVER import this in client components
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

