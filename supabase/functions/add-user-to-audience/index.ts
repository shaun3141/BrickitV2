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

    // Check if welcome email has already been sent
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('welcome_email_sent')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's okay, we'll create the profile
      console.error('Error checking user profile:', profileError);
    }

    const welcomeEmailAlreadySent = profile?.welcome_email_sent ?? false;

    if (welcomeEmailAlreadySent) {
      console.log('Welcome email already sent to user, skipping:', { userId, email: userEmail });
    }

    // Add to Resend general audience (idempotent operation)
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

    // Send welcome email only if not already sent
    let welcomeEmailResult = { success: false, emailId: undefined as string | undefined };
    
    if (!welcomeEmailAlreadySent) {
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

          // Update user profile to mark welcome email as sent
          const { error: updateError } = await supabase
            .from('user_profiles')
            .upsert({
              id: userId,
              welcome_email_sent: true,
            }, {
              onConflict: 'id',
            });

          if (updateError) {
            console.error('Failed to update welcome_email_sent flag (non-critical):', updateError);
          } else {
            console.log('✅ Marked welcome email as sent in user profile:', { userId });
          }
        } else {
          console.warn('Failed to send welcome email (non-critical)');
        }
      } catch (err) {
        console.error('Error sending welcome email (non-critical):', err);
      }
    } else {
      console.log('⏭️ Skipping welcome email - already sent previously');
    }

    return corsResponse(
      {
        success: true,
        contactId: audienceResult.contactId,
        welcomeEmailSent: welcomeEmailResult.success,
        welcomeEmailId: welcomeEmailResult.emailId,
        welcomeEmailSkipped: welcomeEmailAlreadySent,
        message: welcomeEmailAlreadySent 
          ? 'User already in audience, welcome email skipped' 
          : 'User onboarding completed',
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

