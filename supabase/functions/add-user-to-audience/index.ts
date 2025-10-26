// @ts-ignore: Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addToGeneralAudience } from '../_shared/resend-audiences.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface AddUserRequest {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
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
    const { userId, email, firstName, lastName }: AddUserRequest = await req.json();

    // Validate required fields
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Adding user to general audience:', { userId, email });

    // Add to Resend general audience
    const result = await addToGeneralAudience({
      email,
      firstName,
      lastName,
    });

    if (!result.success) {
      console.error('Failed to add user to audience:', result.error);
      // Don't fail the request if audience addition fails - just log it
      // This is non-critical for user signup
    }

    return new Response(
      JSON.stringify({
        success: true,
        contactId: result.contactId,
        message: result.success 
          ? 'User added to general audience successfully' 
          : 'User signup completed (audience addition skipped)',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in add-user-to-audience function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

