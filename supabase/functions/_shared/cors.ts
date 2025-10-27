/**
 * CORS configuration for edge functions
 * Allows production domain and localhost for development
 */

const ALLOWED_ORIGINS = [
  'https://brickit.build',
  'http://localhost:3000',
];

/**
 * Get CORS headers for a given origin
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  // Check if origin is in allowed list
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : 'https://brickit.build';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

