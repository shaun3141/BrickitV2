/**
 * SEO utility functions for updating meta tags dynamically
 */

// Page-specific SEO configurations
const PAGE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'BrickIt - Free LEGO Mosaic Maker | Photo to Brick Converter with Pick a Brick Export',
    description: 'Turn any photo into a buildable LEGO mosaic. Free online tool with Pick a Brick CSV export, smart part substitutions, step-by-step building instructions, and pixel editor. No account required.',
  },
  '/app': {
    title: 'Create LEGO Mosaic | BrickIt - Free Photo to Brick Converter',
    description: 'Upload your photo and create a custom LEGO mosaic. Edit pixels, generate parts lists, and export to Pick a Brick with one click. Free, private, no account required.',
  },
  '/gallery': {
    title: 'LEGO Mosaic Gallery | Community Creations | BrickIt',
    description: 'Browse amazing LEGO mosaic creations from the BrickIt community. Get inspired by custom portraits, pets, landscapes, and more brick art you can build.',
  },
  '/how-it-was-built': {
    title: 'How BrickIt Was Built | 100% AI-Generated Code | BrickIt',
    description: 'Explore how BrickIt was built entirely by AI. Every line of code written through conversation with Claude. Full transparency into the development process.',
  },
  '/donate': {
    title: 'Support BrickIt | Donate | BrickIt',
    description: 'Support the development of BrickIt, the free LEGO mosaic maker. Your donation helps keep the tool free and enables new features.',
  },
};

/**
 * Updates the page title
 */
export function updatePageTitle(title: string): void {
  document.title = title;
  
  // Also update og:title and twitter:title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', title);
}

/**
 * Updates the meta description
 */
export function updateMetaDescription(description: string): void {
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', description);
  
  // Also update og:description and twitter:description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);
  
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', description);
}

/**
 * Updates the canonical tag to point to the current page URL
 * @param url - The full URL to set as canonical (defaults to current page URL)
 */
export function updateCanonicalTag(url?: string): void {
  const canonicalUrl = url || window.location.href;
  
  // Remove query parameters and hash for canonical URL
  const urlObj = new URL(canonicalUrl);
  urlObj.search = '';
  urlObj.hash = '';
  const cleanUrl = urlObj.toString();
  
  // Find existing canonical tag or create one
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  
  canonicalLink.setAttribute('href', cleanUrl);
  
  // Also update og:url
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', cleanUrl);
  
  const twitterUrl = document.querySelector('meta[name="twitter:url"]');
  if (twitterUrl) twitterUrl.setAttribute('content', cleanUrl);
}

/**
 * Updates all SEO tags based on the current route path
 * @param pathname - The pathname to use (defaults to window.location.pathname)
 */
export function updateCanonicalForRoute(pathname?: string): void {
  const baseUrl = 'https://brickit.build';
  const routePath = pathname || window.location.pathname;
  const fullUrl = `${baseUrl}${routePath}`;
  
  // Update canonical
  updateCanonicalTag(fullUrl);
  
  // Update page-specific SEO
  const seo = PAGE_SEO[routePath];
  if (seo) {
    updatePageTitle(seo.title);
    updateMetaDescription(seo.description);
  }
}

/**
 * Sets a custom page title and description (for dynamic pages like /creations/:id)
 */
export function setCustomPageSEO(title: string, description?: string): void {
  updatePageTitle(title);
  if (description) {
    updateMetaDescription(description);
  }
}

