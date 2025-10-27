// @ts-ignore: Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addToGeneralAudience } from '../_shared/resend-audiences.ts';
import { sendEmail } from '../_shared/resend-client.ts';
import { generateWelcomeEmail } from '../_shared/email-templates/welcome.ts';
import { getCorsHeaders, corsResponse } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface AddUserRequest {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    // Validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse(
        { error: 'Missing Authorization header' },
        401,
        origin
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT with Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return corsResponse(
        { error: 'Invalid or expired token' },
        401,
        origin
      );
    }

    const { email, firstName, lastName }: Partial<AddUserRequest> = await req.json();
    
    // Use verified user data instead of request data
    const userId = user.id;
    const userEmail = email || user.email;

    // Validate required fields
    if (!userEmail) {
      return corsResponse(
        { error: 'Missing required field: email' },
        400,
        origin
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return corsResponse(
        { error: 'Invalid email format' },
        400,
        origin
      );
    }

    console.log('Adding user to audience and sending welcome email:', { userId, email: userEmail });

    // Add to Resend general audience
    const audienceResult = await addToGeneralAudience({
      email: userEmail,
      firstName,
      lastName,
    });

    if (!audienceResult.success) {
      console.error('Failed to add user to audience (non-critical):', audienceResult.error);
    }

    // Send welcome email
    let welcomeEmailResult = { success: false, emailId: undefined as string | undefined };
    try {
      const welcomeHtml = generateWelcomeEmail({ userName: firstName });
      
      welcomeEmailResult = await sendEmail({
        to: userEmail,
        subject: 'Welcome to BrickIt! 🧱',
        html: welcomeHtml,
        tags: [
          { name: 'category', value: 'welcome' },
          { name: 'user_id', value: userId },
        ],
      });

      if (!welcomeEmailResult.success) {
        console.warn('Failed to send welcome email (non-critical)');
      }
    } catch (err) {
      console.error('Error sending welcome email (non-critical):', err);
    }

    return corsResponse(
      {
        success: true,
        contactId: audienceResult.contactId,
        welcomeEmailSent: welcomeEmailResult.success,
        welcomeEmailId: welcomeEmailResult.emailId,
        message: 'User onboarding completed',
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Error in add-user-to-audience function:', error);
    return corsResponse(
      { error: 'Internal server error', details: error.message },
      500,
      origin
    );
  }
});

