import { Router, Response } from 'express';
import express from 'express';
import { getStripeClient } from '../services/index';
import { DonationService } from '../services/index';
import { ApiException, asyncHandler } from '../middleware/index';
import { getEnvConfig } from '../config/index';
import type Stripe from 'stripe';

const router = Router();
const donationService = new DonationService();

/**
 * Create Stripe checkout session for donations
 * POST /api/create-checkout-session
 * Body: { amount, userId? }
 */
router.post(
  '/create-checkout-session',
  asyncHandler(async (req, res: Response) => {
    const { amount, userId } = req.body;

    const stripe = getStripeClient();
    const origin = req.headers.origin || getEnvConfig().clientUrl;

    const { sessionId, url } = await donationService.createCheckoutSession(
      stripe,
      amount,
      userId,
      origin
    );

    res.json({ sessionId, url });
  })
);

/**
 * Stripe webhook endpoint
 * POST /api/webhooks/stripe
 * Handles payment events from Stripe
 */
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res: Response) => {
    const stripe = getStripeClient();
    const config = getEnvConfig();
    const sig = req.headers['stripe-signature'];

    if (!config.stripeWebhookSecret) {
      throw new ApiException('Webhook secret not configured', 500);
    }

    if (!sig) {
      throw new ApiException('Missing stripe-signature header', 400);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripeWebhookSecret
      );
    } catch (err: any) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      throw new ApiException(`Webhook Error: ${err.message}`, 400);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('💰 Payment successful:', {
          sessionId: session.id,
          amount: session.amount_total,
          customer_email: session.customer_details?.email,
        });

        // Record donation in database
        try {
          await donationService.recordDonation(session);
          console.log('✅ Donation recorded');

          // Send thank-you email
          try {
            await donationService.sendThankYouEmail(session);
          } catch (emailError) {
            console.error('Failed to send thank-you email:', emailError);
            // Don't fail the webhook if email fails
          }
        } catch (dbError) {
          console.error('Error processing donation:', dbError);
          // Continue anyway - we don't want to retry the webhook
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  })
);

export default router;

