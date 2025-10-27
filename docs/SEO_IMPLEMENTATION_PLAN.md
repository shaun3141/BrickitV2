# BrickIt SEO Implementation Plan

## Overview
This plan implements SEO improvements identified in the audit, focusing on crawlability, performance, and search visibility for brickit.build.

## Tasks

### 1. Add robots.txt and sitemap.xml
**Files to create:**
- `client/public/robots.txt` - Simple rules allowing all crawlers, referencing sitemap
- `client/public/sitemap.xml` - Minimal sitemap with homepage (can expand later)

**Content:**
- robots.txt: `User-agent: *\nAllow: /\nSitemap: https://brickit.build/sitemap.xml`
- sitemap.xml: Basic XML sitemap with homepage URL, lastmod, changefreq, priority

### 2. Clean meta tags
**File:** `client/index.html`
**Changes:**
- Remove lines 18 (`meta keywords`) and 45 (`meta revisit-after`)
- These are outdated/deprecated practices that don't help SEO

### 3. Add server compression and caching
**File:** `server/src/index.ts`
**Dependencies:** Install `compression` package
**Changes:**
- Add compression middleware (gzip/brotli support)
- Set Cache-Control headers for hashed assets in `/assets/*` paths
- Long-term cache for CSS/JS files with content hashes (e.g., `index-BANuX-VB.css`)

### 4. Add Organization and WebSite structured data
**File:** `client/index.html`
**Changes:**
- Add new JSON-LD blocks after existing WebApplication schema:
  - `Organization` schema with name, URL, logo, social profiles
  - `WebSite` schema with url, name, potentialAction for search (placeholder for future)

### 5. SPA 404 hardening
**File:** `server/src/index.ts`
**Changes:**
- Modify catch-all route to check if requested path exists as a real file
- Only return index.html for known SPA routes (root, API routes)
- Return 404 for obviously non-existent files (e.g., `/fake-page.html`)

### 6. Add landing copy to PhotoSelectionTab
**File:** `client/src/components/tabs/PhotoSelectionTab.tsx`
**Changes:**
- Modify the no-image state (lines 51-65) to use a 2-column grid layout
- Left column: Existing ImageUploader card
- Right column: New informational sections:
  - H2: "How It Works"
  - 3-step process list
  - FAQ section (2-3 common questions)
  - Privacy note about client-side processing
- Use proper heading hierarchy (H2/H3) for SEO

### 7. Verify canonical host
**Action:** Check DNS/app configuration
- Ensure www.brickit.build redirects to brickit.build (apex domain)
- This may already be configured in GoDaddy DNS or Fly.io

### 8. Search Console setup
**Action:** Manual steps post-deployment
- Create Google Search Console Domain property for brickit.build
- Add DNS TXT record for verification
- Submit sitemap.xml after deployment
- Request indexing for homepage

## Implementation Order
1. robots.txt and sitemap.xml (independent, easiest)
2. Clean meta tags (independent, quick)
3. Landing copy (independent, visible improvement)
4. Server compression/caching (requires npm install)
5. Structured data additions (independent)
6. SPA 404 hardening (requires testing)
7. Verify canonical host (infrastructure check)
8. Search Console (post-deployment manual step)

## Testing Checklist
- [ ] robots.txt accessible at https://brickit.build/robots.txt
- [ ] sitemap.xml accessible at https://brickit.build/sitemap.xml
- [ ] Meta tags removed from page source
- [ ] Compression working (check response headers)
- [ ] Cache headers present on /assets/* files
- [ ] Structured data validates at https://validator.schema.org
- [ ] Unknown paths return 404 (test /fake-file.html)
- [ ] Known SPA routes still work (root, internal nav)
- [ ] Landing copy displays correctly on mobile and desktop
- [ ] www redirect works (if applicable)

## Notes
- Skipped social card image update per user request
- All changes are SEO-focused and won't affect functionality
- Landing copy adds indexable content without impacting UX flow
