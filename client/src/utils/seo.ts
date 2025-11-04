/**
 * SEO utility functions for updating meta tags dynamically
 */

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
}

/**
 * Updates the canonical tag based on the current route path
 * @param pathname - The pathname to use (defaults to window.location.pathname)
 */
export function updateCanonicalForRoute(pathname?: string): void {
  const baseUrl = 'https://brickit.build';
  const routePath = pathname || window.location.pathname;
  const fullUrl = `${baseUrl}${routePath}`;
  updateCanonicalTag(fullUrl);
}

