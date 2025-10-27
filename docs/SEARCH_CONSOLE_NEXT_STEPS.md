# Google Search Console - Next Steps Checklist

## ✅ Completed
- [x] Verified brickit.build domain in Search Console

## 🔧 Next Steps (Do Now)

### 1. Submit Sitemap (REQUIRED)
1. In Search Console, click on your `brickit.build` property
2. Click **Sitemaps** in the left sidebar
3. Under "Add a new sitemap," enter: `sitemap.xml`
4. Click **Submit**
5. Wait a few minutes - you should see it appear as "Success"

**Expected result:** 
- Status: Success
- Submitted: 1 URL
- Discovered: 1 URL

### 2. Request Indexing for Homepage
1. In Search Console, click **URL Inspection** (left sidebar)
2. Enter: `https://brickit.build/`
3. Click **Enter**
4. Click **Request Indexing** button (if available)
5. Note: This queues the page for indexing within 1-2 days

### 3. Check Coverage Report
1. Click **Coverage** in left sidebar
2. Review for any errors (red/yellow indicators)
3. Should be mostly green with valid pages

### 4. Monitor Performance (Check Back in 7 Days)
1. Click **Performance** in left sidebar
2. After 7-14 days, you'll start seeing search data:
   - Search queries
   - Clicks
   - Impressions
   - Average position
   - Click-through rate (CTR)

## 🎯 Automation Options (Optional)

### Option A: Manual Monitoring (Easiest)
- Bookmark Search Console dashboard
- Check weekly for:
  - New search queries
  - Coverage errors
  - Performance trends

### Option B: Google Search Console API (Advanced)
If you want to automate updates, you can use the API:

```bash
# Install Python dependencies
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib

# Set up OAuth credentials (requires Google Cloud Console setup)
# Then use API to submit sitemaps programmatically
```

**API Endpoints:**
- Submit sitemap: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}`
- Inspect URL: `POST https://www.googleapis.com/webmasters/v3/urlInspection/index:inspect`

### Option C: GitHub Actions (Future)
Could create a GitHub Action that:
- Resubmits sitemap after deployments
- Checks for indexing errors
- Reports to you via email

## 📊 Important Metrics to Track

### Week 1-2
- Is homepage indexed? (Check URL Inspection)
- Any coverage errors?
- Is sitemap processing?

### Week 2-4
- Search impressions starting to appear
- Any crawl errors?
- Mobile usability issues?

### Month 1+
- Core Web Vitals scores
- Top search queries
- Click-through rates
- Average position improvements

## 🚨 What to Watch For

**Bad Signs:**
- Coverage errors increasing
- Pages not indexing after 2 weeks
- Manual actions (security warnings)
- Core Web Vitals failing

**Good Signs:**
- Sitemap processing successfully
- Pages indexing quickly (within days)
- Impressions increasing over time
- CTR improving as you optimize

## 🔗 Quick Links

- Search Console Dashboard: https://search.google.com/search-console
- Your Property: https://search.google.com/search-console?resource_id=sc-domain:brickit.build
- URL Inspection Tool: Built into Search Console
- Schema Validator: https://validator.schema.org/

## 📝 Notes

- **SEO takes time:** Don't expect immediate results
- **Focus on quality:** Ensure landing copy is well-written
- **Monitor weekly:** Check for errors, don't obsess over rankings
- **Resubmit sitemap:** After major content changes

## Next Actions (In Order)

1. ⚡ **DO NOW:** Submit sitemap in Search Console
2. ⚡ **DO NOW:** Request indexing for homepage  
3. ✅ **DONE:** WWW redirect configuration (you'll do this via GoDaddy)
4. 📅 **IN 7 DAYS:** Check back for search data
5. 📅 **IN 14 DAYS:** Review Core Web Vitals

---

**Estimated Time:** 5 minutes for steps 1-2 above

