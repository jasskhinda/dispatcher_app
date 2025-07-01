import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key for client-side usage
const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise;

export const getStripe = () => {
  if (!stripePublicKey) {
    console.warn('Stripe publishable key is not configured');
    return null;
  }
  
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublicKey);
  }
  return stripePromise;
};