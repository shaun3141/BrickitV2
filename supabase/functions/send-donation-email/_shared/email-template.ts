export interface EmailTemplateProps {
  donorName?: string;
  amount: number; // in cents
  donationDate: string;
}

export function generateThankYouEmail({
  donorName,
  amount,
  donationDate,
}: EmailTemplateProps): string {
  const formattedAmount = (amount / 100).toFixed(2);
  const greeting = donorName ? `Hi ${donorName}` : 'Hi there';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Donation!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                ❤️ Thank You!
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; opacity: 0.95;">
                Your generosity makes a difference
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #111827; line-height: 1.6;">
                ${greeting},
              </p>

              <!-- Donation Amount Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #fce7f3 0%, #ede9fe 100%); border-radius: 12px; padding: 30px; text-align: center; border: 2px solid #ec4899;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Your Donation
                    </p>
                    <p style="margin: 0; font-size: 48px; font-weight: bold; color: #ec4899;">
                      $${formattedAmount}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Thank You Message -->
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.8;">
                Thank you so much for your generous donation to <strong>BrickIt</strong>! Your support means the world to us and directly helps fund coding education programs for kids in underrepresented communities.
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.8;">
                With contributions like yours, we can:
              </p>

              <!-- Impact List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #ec4899; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 14px; font-weight: bold;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #374151; line-height: 1.6;">
                          Keep BrickIt free and accessible for everyone
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #ec4899; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 14px; font-weight: bold;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #374151; line-height: 1.6;">
                          Support STEM education initiatives for underserved youth
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 12px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #ec4899; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 14px; font-weight: bold;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #374151; line-height: 1.6;">
                          Continue building new features for the LEGO community
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://brickit.build" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Visit BrickIt
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.8;">
                With gratitude,<br>
                <strong>The BrickIt Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">
                Donation Date: ${donationDate}
              </p>
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #9ca3af;">
                BrickIt - Turn Photos into LEGO Mosaics
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #9ca3af;">
                LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                <a href="https://brickit.build/unsubscribe" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from future emails
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

