import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnvConfig } from '../config/index';

/**
 * Supabase client initialized with service role key
 * Used for server-side operations that bypass RLS policies
 */
export const supabase: SupabaseClient | null = (() => {
  try {
    const config = getEnvConfig();
    return createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return null;
  }
})();

/**
 * Get Supabase client instance
 * Throws error if not properly configured
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

