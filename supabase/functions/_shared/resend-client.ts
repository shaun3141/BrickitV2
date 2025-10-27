// @ts-ignore: npm imports in Deno
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  tags?: Array<{ name: string; value: string }>;
  replyTo?: string;
}

/**
 * Send an email via Resend with standard configuration
 */
export async function sendEmail(options: EmailOptions) {
  const { to, subject, html, tags = [], replyTo } = options;

  try {
    const { data, error } = await resend.emails.send({
      from: 'BrickIt <noreply@brickit.build>',
      to,
      subject,
      html,
      reply_to: replyTo || 'shaun.t.vanweelden@gmail.com',
      tags,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message || String(error) };
    }

    console.log('✅ Email sent successfully:', {
      emailId: data?.id,
      recipient: to,
      subject,
    });

    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

export { resend };

