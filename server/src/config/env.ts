import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment configuration with validation
 * Ensures all required environment variables are present
 */
export interface EnvConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  
  // Supabase
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  
  // Stripe
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  
  // Client
  clientUrl: string;
  
  // CORS
  allowedOrigins: string[];
}

/**
 * Validates and returns environment configuration
 * Throws error if required variables are missing
 */
export function getEnvConfig(): EnvConfig {
  const requiredVars = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  const allowedOrigins = [
    'http://localhost:3000',
    'https://brickit.build',
    'https://brickitv2.fly.dev',
    process.env.CLIENT_URL,
  ].filter(Boolean) as string[];

  return {
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    allowedOrigins,
  };
}

