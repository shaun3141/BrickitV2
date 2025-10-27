/**
 * Welcome Email Template
 * Sent to new users when they sign up
 */

interface WelcomeEmailProps {
  userName?: string;
}

export function generateWelcomeEmail({ userName }: WelcomeEmailProps = {}): string {
  const name = userName || 'there';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BrickIt!</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .button { display: inline-block; padding: 14px 32px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .button:hover { background-color: #1d4ed8; }
  </style>
</head>
<body style="background-color: #f5f5f5; padding: 40px 20px;">
  <div class="container">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <!-- Header with Logo -->
      <tr>
        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
          <div style="font-size: 48px; margin-bottom: 10px;">🧱</div>
          <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">
            Welcome to BrickIt!
          </h1>
        </td>
      </tr>
      
      <!-- Main Content -->
      <tr>
        <td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #1a1a1a; font-size: 18px; font-weight: 600;">
            Hi ${name},
          </p>
          <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Thanks for signing up! You're now ready to turn your favorite photos into stunning LEGO® mosaics. Whether it's a family portrait, a beloved pet, or your favorite landscape, BrickIt makes it easy to create brick art.
          </p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #2563eb; border-radius: 4px;">
            <p style="margin: 0 0 15px; color: #1a1a1a; font-size: 16px; font-weight: 600;">
              🎨 What you can do with BrickIt:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
              <li>Upload any photo and see it transformed instantly</li>
              <li>Customize colors to match your brick collection</li>
              <li>Adjust size from small (16×16) to large (48×48)</li>
              <li>Get a complete parts list for ordering</li>
              <li>Download step-by-step building instructions</li>
              <li>Save and share your creations</li>
            </ul>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="https://brickit.build?utm_source=email&utm_medium=welcome&utm_campaign=signup" 
               class="button"
               style="display: inline-block; padding: 16px 40px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
              Create Your First Mosaic →
            </a>
          </div>
        </td>
      </tr>
      
      <!-- Pro Tips Section -->
      <tr>
        <td style="padding: 30px 40px; background-color: #fefce8; border-top: 1px solid #fef08a;">
          <p style="margin: 0 0 15px; color: #1a1a1a; font-size: 16px; font-weight: 600;">
            💡 Pro Tips for Best Results:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
            <li><strong>Use high-contrast photos</strong> - Images with clear light and dark areas work best</li>
            <li><strong>Portraits are perfect</strong> - Faces and close-ups create stunning mosaics</li>
            <li><strong>Try different filters</strong> - Experiment with color options to match your brick stash</li>
            <li><strong>Start small</strong> - Begin with a 24×24 mosaic to learn the basics</li>
          </ul>
        </td>
      </tr>
      
      <!-- Support Section -->
      <tr>
        <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 15px; font-weight: 600;">
            Need help getting started?
          </p>
          <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
            Just reply to this email with any questions. I'm here to help you create amazing brick art! 🎨
          </p>
        </td>
      </tr>
      
      <!-- Footer -->
      <tr>
        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
            Happy building!
          </p>
          <p style="margin: 0 0 20px; color: #9ca3af; font-size: 13px; line-height: 1.5;">
            BrickIt - Turn photos into LEGO® mosaics<br>
            <a href="https://brickit.build" style="color: #2563eb; text-decoration: none;">brickit.build</a>
          </p>
          <p style="margin: 0; color: #d1d5db; font-size: 11px;">
            LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this application.
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}

