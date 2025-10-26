// @ts-ignore: npm imports in Deno
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Audience ID - using single audience for free plan
// Users are differentiated by tags (user_type: 'user' or 'donor')
const AUDIENCE_ID = Deno.env.get('RESEND_AUDIENCE_ID') || '020e86f9-4fcf-41c4-9016-68d6de7d1912';

export interface ContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
}

/**
 * Add a contact to the audience
 * Note: Free Resend plan allows only 1 audience, so all contacts go to the same audience
 * Donors and regular users are not differentiated (would need paid plan for multiple audiences)
 */
export async function addToGeneralAudience(contactData: ContactData): Promise<{ success: boolean; error?: string; contactId?: string }> {
  if (!AUDIENCE_ID) {
    console.warn('⚠️ RESEND_AUDIENCE_ID not configured - skipping audience addition');
    return { success: false, error: 'Audience ID not configured' };
  }

  try {
    const { data, error } = await resend.contacts.create({
      audienceId: AUDIENCE_ID,
      email: contactData.email,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      unsubscribed: contactData.unsubscribed ?? false,
    });

    if (error) {
      console.error('Failed to add contact to audience:', error);
      return { success: false, error: error.message || String(error) };
    }

    console.log('✅ Added contact to audience:', {
      email: contactData.email,
      contactId: data?.id,
    });

    return { success: true, contactId: data?.id };
  } catch (error) {
    console.error('Error adding contact to audience:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Add a donor to the audience
 * Note: Uses same audience as general users (free plan limitation)
 * On paid plans, you can use a separate DONOR_AUDIENCE_ID
 */
export async function addToDonorAudience(contactData: ContactData): Promise<{ success: boolean; error?: string; contactId?: string }> {
  // For now, donors go to the same audience as all users
  // This allows duplicate calls without issues (Resend handles duplicates gracefully)
  return addToGeneralAudience(contactData);
}

/**
 * Legacy function - now both add to same audience due to free plan limitation
 */
export async function addToBothAudiences(contactData: ContactData): Promise<{
  general: { success: boolean; error?: string; contactId?: string };
  donor: { success: boolean; error?: string; contactId?: string };
}> {
  const result = await addToGeneralAudience(contactData);
  
  return {
    general: result,
    donor: result, // Same result since they go to the same audience
  };
}

