// @ts-ignore: Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: npm imports in Deno
import { Resend } from 'npm:resend@2.0.0';
import { generateThankYouEmail } from './_shared/email-template.ts';
import { addToDonorAudience } from '../_shared/resend-audiences.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface DonationEmailRequest {
  donorEmail: string;
  donorName?: string;
  amount: number; // in cents
  userId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request body
    const { donorEmail, donorName, amount, userId }: DonationEmailRequest = await req.json();

    // Validate required fields
    if (!donorEmail || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: donorEmail, amount' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(donorEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate email HTML
    const donationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlContent = generateThankYouEmail({
      donorName,
      amount,
      donationDate,
    });

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'BrickIt <noreply@brickit.build>',
      to: donorEmail,
      subject: 'Thank you for supporting BrickIt! ❤️',
      html: htmlContent,
      reply_to: 'shaun.t.vanweelden@gmail.com',
      tags: [
        { name: 'category', value: 'donation-thank-you' },
        { name: 'amount', value: String(amount) },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Email sent successfully:', {
      emailId: data?.id,
      recipient: donorEmail,
      amount: amount / 100,
      userId,
    });

    // Add donor to donor audience
    const audienceResult = await addToDonorAudience({
      email: donorEmail,
      firstName: donorName,
    });

    if (!audienceResult.success) {
      console.warn('Failed to add donor to audience (non-critical):', audienceResult.error);
      // Don't fail the request if audience addition fails - email was sent successfully
    } else {
      console.log('✅ Donor added to donor audience:', { contactId: audienceResult.contactId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: data?.id,
        message: 'Thank you email sent successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-donation-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

