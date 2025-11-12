import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getSupabaseClient } from './supabase';
import { getEnvConfig } from '../config/index';

/**
 * Service for managing donation operations
 */
export class DonationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Create a Stripe checkout session for donations
   */
  async createCheckoutSession(
    stripe: Stripe,
    amount: number,
    userId: string | null,
    origin: string
  ): Promise<{ sessionId: string; url: string | null }> {
    // Validate amount (minimum $1, maximum $999,999)
    if (amount < 100 || amount > 99999900) {
      throw new Error('Invalid donation amount');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'BrickIt Donation',
              description: 'Support BrickIt and coding education for kids in underrepresented communities',
              images: ['https://brickit.build/brickit_logo.png'],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?donation=success`,
      cancel_url: `${origin}/?donation=cancelled`,
      metadata: {
        type: 'donation',
        user_id: userId || '',
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Record a completed donation in the database
   */
  async recordDonation(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.user_id || null;

    // Handle payment_intent - it can be a string ID or an expanded PaymentIntent object
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id || null;

    if (!paymentIntentId) {
      throw new Error('Missing payment_intent in checkout session');
    }

    const { error } = await this.supabase.from('donations').insert({
      user_id: userId,
      amount: session.amount_total,
      currency: session.currency,
      stripe_payment_intent_id: paymentIntentId,
      stripe_session_id: session.id,
      status: 'completed',
      metadata: {
        customer_email: session.customer_details?.email,
        customer_name: session.customer_details?.name,
      },
    });

    if (error) {
      throw new Error(`Failed to record donation: ${error.message}`);
    }
  }

  /**
   * Send thank-you email via Supabase Edge Function
   */
  async sendThankYouEmail(session: Stripe.Checkout.Session): Promise<void> {
    const config = getEnvConfig();

    try {
      const emailResponse = await fetch(
        `${config.supabaseUrl}/functions/v1/send-donation-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.supabaseAnonKey}`,
          },
          body: JSON.stringify({
            donorEmail: session.customer_details?.email,
            donorName: session.customer_details?.name,
            amount: session.amount_total,
            userId: session.metadata?.user_id || null,
          }),
        }
      );

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Failed to send thank-you email:', errorData);
        throw new Error('Failed to send thank-you email');
      }

      const emailData = await emailResponse.json();
      console.log('✅ Thank-you email sent:', emailData);
    } catch (error) {
      console.error('Error calling email Edge Function:', error);
      // Don't fail the webhook if email fails
      throw error;
    }
  }
}

