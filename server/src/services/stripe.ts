import Stripe from 'stripe';
import { getEnvConfig } from '../config/index';

/**
 * Stripe client initialized with secret key
 * Null if not configured (donations disabled)
 */
export const stripe: Stripe | null = (() => {
  try {
    const config = getEnvConfig();
    
    if (!config.stripeSecretKey) {
      console.warn('⚠️  Stripe is not configured. Set STRIPE_SECRET_KEY in .env to enable donations.');
      return null;
    }

    return new Stripe(config.stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return null;
  }
})();

/**
 * Get Stripe client instance
 * Throws error if not properly configured
 */
export function getStripeClient(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  return stripe;
}

