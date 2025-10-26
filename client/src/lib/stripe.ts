import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.warn('Stripe publishable key not configured');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export const createCheckoutSession = async (
  amount: number, 
  userId?: string
): Promise<{ sessionId: string; url: string }> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  const response = await fetch(`${apiUrl}/api/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create checkout session' }));
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const data = await response.json();
  return data;
};

export const redirectToCheckout = async (amount: number, userId?: string): Promise<void> => {
  try {
    const { url } = await createCheckoutSession(amount, userId);
    
    if (!url) {
      throw new Error('No checkout URL returned from server');
    }

    // Open Stripe Checkout page in a new tab
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
};

