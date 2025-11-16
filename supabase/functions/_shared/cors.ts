/**
 * CORS configuration for edge functions
 * Allows production domain and localhost for development
 */

const ALLOWED_ORIGINS = [
  'https://brickit.build',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://localhost:5174', // Vite alternate port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

/**
 * Check if an origin is allowed
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a given origin
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  // Determine allowed origin
  let allowedOrigin: string;
  
  if (origin && isAllowedOrigin(origin)) {
    // Origin is explicitly allowed
    allowedOrigin = origin;
  } else if (origin && origin.includes('localhost')) {
    // In development, be permissive with localhost (any port)
    allowedOrigin = origin;
  } else if (origin && origin.includes('127.0.0.1')) {
    // Also allow 127.0.0.1 in development
    allowedOrigin = origin;
  } else {
    // Default to production or the provided origin if it exists
    allowedOrigin = origin || 'https://brickit.build';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Create a JSON response with CORS headers
 */
export function corsResponse(
  body: any,
  status: number,
  origin: string | null
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin),
      },
    }
  );
}

