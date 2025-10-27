import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';

/**
 * Custom request interface with authenticated user ID
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Middleware to verify JWT token and attach userId to request
 * Returns 401 if token is invalid or missing
 */
export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const userId = await getUserFromToken(token);

    if (!userId) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Helper function to verify token and extract user ID
 */
async function getUserFromToken(token: string): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

