import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Initialize Supabase with service role key for server-side operations
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Webhook endpoint needs raw body for signature verification
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️  Stripe webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  if (!stripe) {
    return res.status(500).send('Stripe not configured');
  }

  if (!supabase) {
    return res.status(500).send('Supabase not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        console.log('💰 Payment successful:', {
          sessionId: session.id,
          amount: session.amount_total,
          customer_email: session.customer_details?.email
        });

        // Get user_id from session metadata if available
        const userId = session.metadata?.user_id || null;

        // Store donation in database
        const { data, error } = await supabase
          .from('donations')
          .insert({
            user_id: userId,
            amount: session.amount_total,
            currency: session.currency,
            stripe_payment_intent_id: session.payment_intent,
            stripe_session_id: session.id,
            status: 'completed',
            metadata: {
              customer_email: session.customer_details?.email,
              customer_name: session.customer_details?.name,
            }
          });

        if (error) {
          console.error('Error storing donation:', error);
        } else {
          console.log('✅ Donation recorded:', data);
          
          // Send thank-you email via Edge Function
          try {
            const emailResponse = await fetch(
              `${process.env.SUPABASE_URL}/functions/v1/send-donation-email`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  donorEmail: session.customer_details?.email,
                  donorName: session.customer_details?.name,
                  amount: session.amount_total,
                  userId: userId,
                }),
              }
            );

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json();
              console.error('Failed to send thank-you email:', errorData);
            } else {
              const emailData = await emailResponse.json();
              console.log('✅ Thank-you email sent:', emailData);
            }
          } catch (emailError) {
            console.error('Error calling email Edge Function:', emailError);
            // Don't fail the webhook if email fails
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('❌ Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Webhook processing error');
  }
});

// All other routes use JSON parsing
app.use(express.json());

// Serve static files from the client dist directory
app.use(express.static(path.join(__dirname, 'client/dist')));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Create Stripe checkout session for donations
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const { amount, userId } = req.body;

    // Validate amount (minimum $1, maximum $999,999)
    if (!amount || amount < 100 || amount > 99999900) {
      return res.status(400).json({ error: 'Invalid donation amount' });
    }

    // Get the origin from the request or use fallback
    const origin = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';

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
        user_id: userId || null,
      },
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Handle client-side routing - always return index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!stripe) {
    console.warn('⚠️  Stripe is not configured. Set STRIPE_SECRET_KEY in .env to enable donations.');
  } else {
    console.log('✓ Stripe is configured and ready for donations');
  }
});

