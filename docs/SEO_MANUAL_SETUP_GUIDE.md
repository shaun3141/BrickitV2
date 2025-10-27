# SEO Manual Setup Guide

## Deployment Complete ✅

Your SEO improvements have been deployed to production at https://brickit.build

## Task 1: Configure WWW Redirect

### Goal
Redirect `www.brickit.build` → `brickit.build` to ensure consistent domain preference.

### Method: GoDaddy DNS Redirect

**Option A: Using GoDaddy DNS Panel (Easiest)**

1. Log in to your GoDaddy account at https://www.godaddy.com
2. Navigate to **My Products** → Find **brickit.build** domain
3. Click **DNS** button next to your domain
4. Scroll down to **Forwarding** section
5. Click **Add** (next to Forwarding)
6. Configure:
   - **Type:** Select **Forwarding**
   - **From:** `www.brickit.build`
   - **To:** `https://brickit.build` (or just `brickit.build`)
   - **Forward type:** Choose **Permanent (301)** for SEO
   - **Settings:** Check "Update nameservers and DNS records"
7. Click **Save**
8. Wait 5-30 minutes for DNS propagation

**Option B: Using GoDaddy API (Programmatic)**

If you prefer to use the API, you can make a redirect record:

```bash
# Get your GoDaddy API credentials (you have them)
API_KEY="AEPxKbnrZXs_Mx3yYSA3UDum2fRiRjiw4c"
API_SECRET="9KaqWG9FVLsxs2mhDLYKpm"

# Add A record for www pointing to Fly.io IP (check your current A record)
# Then handle redirect at application level
```

**Testing the Redirect:**
After DNS propagates (5-30 minutes):
```bash
curl -I https://www.brickit.build
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://brickit.build
```

**Alternative: Application-Level Redirect**

If DNS forwarding doesn't work or you prefer app-level handling, you can add this to your server:

```typescript
// In server/src/index.ts, before the catch-all route
app.get('*', (req: Request, res: Response) => {
  // Handle www redirect
  if (req.hostname === 'www.brickit.build') {
    return res.redirect(301, `https://brickit.build${req.url}`);
  }
  // ... rest of your routing
});
```

---

## Task 2: Google Search Console Setup

### Step 1: Create Search Console Property

1. Go to https://search.google.com/search-console
2. If not logged in, sign in with your Google account
3. Click **Add Property** button
4. Choose **Domain** property type (not URL prefix)
5. Enter: `brickit.build`
6. Click **Continue**

### Step 2: Verify Domain Ownership

You'll see multiple verification methods. Choose **DNS verification**:

1. Copy the verification code (looks like: `google-site-verification=XXXXXXXXXXXXXXXXXXXXXX`)
2. Add it as a TXT record in GoDaddy DNS:
   - Log in to GoDaddy
   - Go to your domain's DNS settings
   - In the **Records** section, click **Add**
   - Select **TXT** record type
   - **Name:** `@` (or leave blank for root domain)
   - **Value:** Paste the entire verification code
   - **TTL:** 600 (default)
   - Click **Save**

### Step 3: Wait for DNS Propagation

- Usually takes 5-30 minutes
- You can check with: `dig TXT brickit.build` (should show Google verification)
- The verification code appears in the response

### Step 4: Verify in Search Console

1. Go back to Search Console
2. Click **Verify** button
3. If successful, you'll see your domain property dashboard

### Step 5: Submit Sitemap

1. In Search Console, click on your `brickit.build` property
2. In the left sidebar, click **Sitemaps**
3. Under "Add a new sitemap," enter: `sitemap.xml`
4. Click **Submit**
5. Search Console will crawl your sitemap
6. You should see it appear as "Success" within a few minutes

### Step 6: Request Indexing

1. In Search Console, click **URL Inspection** (in left sidebar)
2. Enter: `https://brickit.build/`
3. Click **Enter**
4. If the page is already indexed, you'll see "URL is on Google"
5. If not, click **Request Indexing** button
6. Wait 1-2 days for Google to crawl and index

### Step 7: Monitor Performance

After 7-14 days, you'll start seeing data:

1. **Performance** report: Shows search queries, clicks, impressions, CTR
2. **Coverage** report: Check for 404 errors or indexing issues
3. **Core Web Vitals**: Review performance metrics
4. **Mobile Usability**: Ensure no mobile issues

### Quick Checklist

- [ ] GoDaddy DNS forwarding configured for www → apex
- [ ] Search Console property created for brickit.build
- [ ] DNS TXT record added for verification
- [ ] Verification successful in Search Console
- [ ] Sitemap submitted (`sitemap.xml`)
- [ ] Homepage indexing requested
- [ ] Bookmarked Search Console dashboard for monitoring

### Expected Timeline

- **DNS Redirect:** 5-30 minutes
- **Search Console Verification:** 5-30 minutes
- **Sitemap Crawling:** Immediate to 24 hours
- **Search Indexing:** 1-7 days
- **Performance Data:** 7-14 days after indexing

### Ongoing Maintenance

- Check Search Console weekly for errors
- Resubmit sitemap after major updates
- Monitor Core Web Vitals monthly
- Review search queries quarterly

---

## Troubleshooting

### Redirect Not Working

If www redirect doesn't work after 30 minutes:
1. Check DNS propagation: `dig www.brickit.build`
2. Verify GoDaddy settings saved correctly
3. Consider application-level redirect as fallback

### Search Console Verification Fails

If verification fails:
1. Check DNS TXT record exists: `dig TXT brickit.build`
2. Ensure no typos in the verification code
3. Wait up to 48 hours for DNS propagation
4. Try alternative verification method (HTML file upload)

### Sitemap Shows Errors

If sitemap shows errors:
1. Verify sitemap accessible: `curl https://brickit.build/sitemap.xml`
2. Check XML format is valid
3. Ensure all URLs return 200 status
4. Re-submit after fixing issues

---

## Quick Command Reference

```bash
# Check DNS propagation
dig brickit.build
dig www.brickit.build

# Test redirect
curl -I https://www.brickit.build

# Test sitemap
curl https://brickit.build/sitemap.xml

# Test robots.txt
curl https://brickit.build/robots.txt

# Check compression (should see gzip)
curl -H "Accept-Encoding: gzip" -I https://brickit.build/

# Validate structured data
# Use: https://validator.schema.org/
```

## Need Help?

- GoDaddy Support: https://www.godaddy.com/help
- Search Console Help: https://support.google.com/webmasters
- Verify structured data: https://validator.schema.org/

