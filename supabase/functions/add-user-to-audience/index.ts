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
  
  // Log for debugging (remove in production if needed)
  console.log('Request received:', {
    method: req.method,
    origin,
    url: req.url,
    hasAuth: !!req.headers.get('authorization'),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(origin);
    console.log('CORS preflight response:', corsHeaders);
    return new Response('ok', { headers: corsHeaders });
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

    console.log('Processing user audience addition:', { userId, email: userEmail });

    // Add to Resend general audience (idempotent operation - always safe to call)
    const audienceResult = await addToGeneralAudience({
      email: userEmail,
      firstName,
      lastName,
    });

    if (!audienceResult.success) {
      console.error('Failed to add user to audience (non-critical):', audienceResult.error);
    } else {
      console.log('✅ User added to audience:', { contactId: audienceResult.contactId });
    }

    // Atomic "claim" pattern for welcome email - prevents race conditions
    // This UPDATE only succeeds if welcome_email_sent is currently false
    // If two requests race, only one will "claim" the email (get a row back)
    let welcomeEmailResult = { success: false, emailId: undefined as string | undefined };
    let welcomeEmailClaimed = false;
    
    const { data: claimed, error: claimError } = await supabase
      .from('user_profiles')
      .update({ welcome_email_sent: true })
      .eq('id', userId)
      .eq('welcome_email_sent', false)
      .select('id')
      .maybeSingle();

    if (claimError) {
      console.error('Error claiming welcome email slot:', claimError);
    }

    if (claimed) {
      // We successfully claimed the welcome email - send it
      welcomeEmailClaimed = true;
      console.log('✅ Claimed welcome email slot for user:', { userId, email: userEmail });
      
      try {
        console.log('Sending welcome email to new user:', { userId, email: userEmail });
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

        if (welcomeEmailResult.success) {
          console.log('✅ Welcome email sent successfully:', { 
            emailId: welcomeEmailResult.emailId,
            userId,
            email: userEmail 
          });
        } else {
          console.warn('Failed to send welcome email (non-critical)');
          // Note: Flag is already set to true, so we won't retry automatically
          // This prevents spam if there's a temporary email issue
        }
      } catch (err) {
        console.error('Error sending welcome email (non-critical):', err);
      }
    } else {
      // Either already sent OR claimed by a concurrent request - skip
      console.log('⏭️ Welcome email already sent or claimed by another request:', { userId });
    }

    return corsResponse(
      {
        success: true,
        contactId: audienceResult.contactId,
        welcomeEmailSent: welcomeEmailResult.success,
        welcomeEmailId: welcomeEmailResult.emailId,
        welcomeEmailSkipped: !welcomeEmailClaimed,
        message: welcomeEmailClaimed 
          ? 'User onboarding completed' 
          : 'User already in audience, welcome email skipped',
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

