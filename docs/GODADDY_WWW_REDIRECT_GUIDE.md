# GoDaddy WWW Redirect Setup Guide

## Configure www.brickit.build → brickit.build Redirect

### Step-by-Step Instructions

1. **Log in to GoDaddy**
   - Go to https://www.godaddy.com
   - Click "Sign In" (top right)
   - Enter your credentials

2. **Navigate to DNS Settings**
   - Click "My Products" from the top menu
   - Find your `brickit.build` domain in the list
   - Click the "DNS" button next to your domain
   - You'll now see the DNS Management page

3. **Find the Forwarding Section**
   - Scroll down past the DNS Records table
   - Look for a section labeled "Forwarding" or "Website Forwarding"
   - This section may be at the bottom of the page

4. **Add Forwarding Rule**
   - Click the "Add" button (or "+" icon) next to "Forwarding"
   - You'll see a form to configure forwarding

5. **Configure the Forwarding Rule**
   - **Domain (From):** Select or enter `www.brickit.build`
   - **Forward to:** Enter `https://brickit.build` (or just `brickit.build`)
   - **Forward type:** Select **Permanent (301)** ⚠️ IMPORTANT: Use 301, not 302
   - **Settings:** Check any options like "Update nameservers and DNS records" if offered
   - Click **Save** or **Add**

6. **Wait for Propagation**
   - DNS changes can take 5-30 minutes to propagate
   - You can test it by visiting https://www.brickit.build in your browser
   - It should automatically redirect to https://brickit.build

### Alternative: If You Don't See Forwarding Option

If you don't see a "Forwarding" section, GoDaddy may have a different interface. Try these alternatives:

**Option A: Update DNS Records**
1. In the DNS Records section, find the A record for `www`
2. If it exists, you can delete it (not recommended if it's working)
3. Or change it to a CNAME pointing to `brickit.build`

**Option B: Contact GoDaddy Support**
- GoDaddy support can help configure the redirect
- Call: 1-480-505-8877
- Chat: Available on godaddy.com/help

### Testing Your Redirect

After setup, test with this command:
```bash
curl -I https://www.brickit.build
```

You should see:
```
HTTP/2 301 Moved Permanently
location: https://brickit.build/
```

### Troubleshooting

**Problem:** Redirect doesn't work after 30 minutes
- Check that you selected "Permanent (301)" not "Temporary (302)"
- Verify the forwarding target is `https://brickit.build` (with https://)
- Try clearing your browser cache
- Check if forwarding is enabled in GoDaddy settings

**Problem:** Can't find Forwarding section
- Look for "Subdomain Forwarding" or "URL Forwarding"
- Try accessing via: https://dcc.godaddy.com/manage/...
- Contact GoDaddy support for assistance

**Problem:** Redirect works but SSL warning appears
- SSL should be handled automatically by Fly.io
- The warning may appear temporarily during propagation
- If it persists, check Fly.io SSL settings

### Using GoDaddy API (Advanced)

If you prefer programmatic setup using the API:

```bash
# You already have credentials in your notes:
API_KEY="AEPxKbnrZXs_Mx3yYSA3UDum2fRiRjiw4c"
API_SECRET="9KaqWG9FVLsxs2mhDLYKpm"

# Note: Forwarding rules typically need to be set via web interface
# DNS records can be managed via API
```

### Next Steps After Redirect is Working

Once the redirect is confirmed:
1. ✅ Test: `curl -I https://www.brickit.build` returns 301
2. ✅ Proceed to Google Search Console setup
3. ✅ Submit sitemap: `https://brickit.build/sitemap.xml`

---

**Important:** Search engines will eventually recognize the apex domain (brickit.build) as canonical once redirects are in place. This is considered best practice for SEO.

