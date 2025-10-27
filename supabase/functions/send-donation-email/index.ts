// @ts-ignore: Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateThankYouEmail } from './_shared/email-template.ts';
import { addToDonorAudience } from '../_shared/resend-audiences.ts';
import { sendEmail } from '../_shared/resend-client.ts';
import { getCorsHeaders, corsResponse } from '../_shared/cors.ts';

interface DonationEmailRequest {
  donorEmail: string;
  donorName?: string;
  amount: number; // in cents
  userId?: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight - restrict to known origins (backend only)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    // This function should only be called from the backend (after webhook validation)
    // Validate that an Authorization header is present (either anon key or service role)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse(
        { error: 'Unauthorized: Missing Authorization header' },
        401,
        origin
      );
    }

    // Parse request body
    const { donorEmail, donorName, amount, userId }: DonationEmailRequest = await req.json();

    // Validate required fields
    if (!donorEmail || !amount) {
      return corsResponse(
        { error: 'Missing required fields: donorEmail, amount' },
        400,
        origin
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(donorEmail)) {
      return corsResponse(
        { error: 'Invalid email format' },
        400,
        origin
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
    const emailResult = await sendEmail({
      to: donorEmail,
      subject: 'Thank you for supporting BrickIt! ❤️',
      html: htmlContent,
      tags: [
        { name: 'category', value: 'donation-thank-you' },
        { name: 'amount', value: String(amount) },
        { name: 'user_id', value: userId || 'anonymous' },
      ],
    });

    if (!emailResult.success) {
      console.error('Failed to send donation email:', emailResult.error);
      return corsResponse(
        { error: 'Failed to send email', details: emailResult.error },
        500,
        origin
      );
    }

    console.log('Donation email sent successfully:', {
      emailId: emailResult.emailId,
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

    return corsResponse(
      {
        success: true,
        emailId: emailResult.emailId,
        donorAddedToAudience: audienceResult.success,
        message: 'Thank you email sent successfully',
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Error in send-donation-email function:', error);
    return corsResponse(
      { error: 'Internal server error', details: error.message },
      500,
      origin
    );
  }
});

