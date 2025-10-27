/**
 * Get the base URL for the application based on environment
 */
export function getBaseUrl(): string {
  // In production, use the actual domain
  if (import.meta.env.PROD) {
    return 'https://brickit.build';
  }
  
  // In development, use current origin (handles localhost:3000, etc.)
  return window.location.origin;
}

/**
 * Get the redirect URL for OAuth callbacks
 */
export function getAuthRedirectUrl(): string {
  return getBaseUrl();
}

/**
 * Get the API URL based on environment
 */
export function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    console.warn('VITE_API_URL not set, falling back to base URL');
    return getBaseUrl();
  }
  
  return apiUrl;
}

