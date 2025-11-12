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
 * 
 * IMPORTANT: Always returns 200 to Stripe after signature verification
 * to acknowledge receipt, even if processing fails internally.
 * This prevents Stripe from retrying the webhook.
 */
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res: Response) => {
    const stripe = getStripeClient();
    const config = getEnvConfig();
    const sig = req.headers['stripe-signature'];

    // Log incoming webhook request
    console.log('📥 Stripe webhook received:', {
      method: req.method,
      path: req.path,
      hasSignature: !!sig,
      contentType: req.headers['content-type'],
      timestamp: new Date().toISOString(),
    });

    // Check for webhook secret configuration
    if (!config.stripeWebhookSecret) {
      console.error('❌ CRITICAL: STRIPE_WEBHOOK_SECRET not configured in environment');
      // Return 500 to indicate server configuration error
      // This should be fixed immediately, but we return error so Stripe knows it's a server issue
      return res.status(500).json({ 
        error: 'Webhook secret not configured',
        message: 'STRIPE_WEBHOOK_SECRET environment variable is missing'
      });
    }

    // Check for signature header
    if (!sig) {
      console.error('❌ Missing stripe-signature header');
      // Return 400 for missing signature (client error)
      return res.status(400).json({ 
        error: 'Missing stripe-signature header' 
      });
    }

    // Ensure signature is a string (Express headers can be string | string[])
    const signatureString = Array.isArray(sig) ? sig[0] : sig;

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signatureString,
        config.stripeWebhookSecret
      );
      console.log('✅ Webhook signature verified:', {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
      });
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', {
        error: err.message,
        signature: signatureString.substring(0, 20) + '...',
      });
      // Return 400 for invalid signature
      return res.status(400).json({ 
        error: 'Invalid signature',
        message: err.message 
      });
    }

    // At this point, signature is verified - always return 200 to acknowledge receipt
    // Process the event asynchronously, but send response immediately
    res.status(200).json({ received: true });

    // Handle the event (after sending response)
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          // Handle both thin and snapshot payloads
          // Thin payloads may have minimal data, snapshot payloads contain full object
          let session: Stripe.Checkout.Session;
          const sessionData = event.data.object as Stripe.Checkout.Session;
          
          // Check if we have the required data (amount_total is a key field we need)
          // If missing, this is likely a thin payload and we need to fetch the full object
          const needsFetch = !sessionData.amount_total || !sessionData.currency;
          
          if (needsFetch) {
            // Thin payload or incomplete data - fetch full object
            console.log('📦 Thin/incomplete payload detected, fetching full session:', sessionData.id);
            session = await stripe.checkout.sessions.retrieve(sessionData.id, {
              expand: ['payment_intent', 'customer'],
            });
            console.log('✅ Full session retrieved from API');
          } else {
            // Snapshot payload - contains full object with all required data
            session = sessionData;
            console.log('📦 Snapshot payload detected, using full object from event');
          }

          console.log('💰 Processing checkout.session.completed:', {
            sessionId: session.id,
            amount: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_details?.email,
            customer_name: session.customer_details?.name,
            livemode: event.livemode,
            payloadType: needsFetch ? 'thin' : 'snapshot',
          });

          // Record donation in database
          try {
            await donationService.recordDonation(session);
            console.log('✅ Donation recorded in database:', session.id);

            // Send thank-you email
            try {
              await donationService.sendThankYouEmail(session);
              console.log('✅ Thank-you email sent:', session.customer_details?.email);
            } catch (emailError: any) {
              console.error('❌ Failed to send thank-you email:', {
                sessionId: session.id,
                error: emailError.message,
                stack: emailError.stack,
              });
              // Don't fail the webhook if email fails
            }
          } catch (dbError: any) {
            console.error('❌ Error processing donation:', {
              sessionId: session.id,
              error: dbError.message,
              stack: dbError.stack,
            });
            // Log error but don't fail webhook - already acknowledged to Stripe
          }

          break;
        }

        case 'payment_intent.payment_failed': {
          // Handle both thin and snapshot payloads
          let paymentIntent: Stripe.PaymentIntent;
          const paymentIntentData = event.data.object as Stripe.PaymentIntent;
          
          // Check if we have the required data
          const needsFetch = !paymentIntentData.amount || !paymentIntentData.currency;
          
          if (needsFetch) {
            console.log('📦 Thin/incomplete payload detected, fetching full payment intent:', paymentIntentData.id);
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentData.id);
            console.log('✅ Full payment intent retrieved from API');
          } else {
            paymentIntent = paymentIntentData;
          }
          
          console.log('❌ Payment failed:', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            failureMessage: paymentIntent.last_payment_error?.message,
            payloadType: needsFetch ? 'thin' : 'snapshot',
          });
          break;
        }

        default:
          console.log('ℹ️  Unhandled event type:', {
            eventType: event.type,
            eventId: event.id,
          });
      }
    } catch (processingError: any) {
      // Log processing errors but don't fail webhook (already acknowledged)
      console.error('❌ Error processing webhook event:', {
        eventId: event.id,
        eventType: event.type,
        error: processingError.message,
        stack: processingError.stack,
      });
    }
  })
);

export default router;

