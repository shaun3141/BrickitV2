// @ts-ignore: Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore: npm imports in Deno
import { Webhook } from 'npm:svix@1.15.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Webhook verification secret
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET');

interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    tags?: Array<{ name: string; value: string }>;
  };
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let event: ResendWebhookEvent;

    // Verify webhook signature if secret is configured
    if (RESEND_WEBHOOK_SECRET) {
      const svixId = req.headers.get('svix-id');
      const svixTimestamp = req.headers.get('svix-timestamp');
      const svixSignature = req.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('Missing Svix signature headers');
        return new Response(
          JSON.stringify({ error: 'Missing signature headers' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get raw body for signature verification
      const body = await req.text();
      
      try {
        const wh = new Webhook(RESEND_WEBHOOK_SECRET);
        wh.verify(body, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
        console.log('✅ Webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Parse the body after verification
      event = JSON.parse(body);
    } else {
      // No secret configured, just parse the body
      console.warn('⚠️ Webhook secret not configured - signature verification disabled');
      event = await req.json();
    }
    
    console.log('Received Resend webhook event:', {
      type: event.type,
      emailId: event.data.email_id,
      to: event.data.to,
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract donation amount from tags if available
    const amountTag = event.data.tags?.find(tag => tag.name === 'amount');
    const categoryTag = event.data.tags?.find(tag => tag.name === 'category');

    // Log the event to a tracking table (you may want to create this table)
    // For now, just log important events
    if (event.type === 'email.bounced' || event.type === 'email.complained') {
      console.warn(`⚠️ Email ${event.type}:`, {
        emailId: event.data.email_id,
        recipient: event.data.to,
        subject: event.data.subject,
        category: categoryTag?.value,
      });
      
      // TODO: If this is a donation email, you might want to update the donation record
      // or flag the user's email for review
    }

    if (event.type === 'email.delivered') {
      console.log('✅ Email delivered successfully:', {
        emailId: event.data.email_id,
        recipient: event.data.to,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventType: event.type,
        message: 'Webhook processed successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing Resend webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

