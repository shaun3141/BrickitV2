import { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setAuthSession } from './session';
import { getAuthRedirectUrl } from '@/lib/env';
import { posthog } from '@/services/analytics.service';

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

interface AuthContextType {
  user: User | null;
  session: Session;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Determines if a user is newly signed up vs a returning user.
 * For new users, created_at and last_sign_in_at are nearly identical.
 * For returning users, last_sign_in_at is significantly later than created_at.
 */
function isNewUser(user: User): boolean {
  const createdAt = new Date(user.created_at).getTime();
  const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
  
  // If created_at and last_sign_in_at are within 60 seconds, it's a new user
  const timeDiff = Math.abs(lastSignIn - createdAt);
  return timeDiff < 60 * 1000; // 60 seconds tolerance
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth provider');

    // Helper to update session state
    const updateSession = (session: Session | null) => {
      console.log('[AuthContext] Updating session:', { hasSession: !!session, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
      setAuthSession(session);
      setLoading(false);
    };

    // IMPORTANT: Follow Supabase best practices to avoid deadlocks
    // See docs/AUTH_INITIALIZATION_BEST_PRACTICES.md for details
    // 
    // Key points:
    // 1. Call getSession() FIRST (recommended pattern)
    // 2. Keep onAuthStateChange callback SYNCHRONOUS (no async)
    // 3. Defer all async operations using setTimeout to prevent deadlocks

    // Step 1: Get initial session (recommended pattern from Supabase docs)
    console.log('[AuthContext] Fetching initial session...');
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        console.log('[AuthContext] Initial session loaded:', { hasSession: !!session, error: error?.message });
        if (error) {
          console.error('[AuthContext] Error loading session:', error);
          updateSession(null);
        } else {
          updateSession(session);
        }
      })
      .catch((err) => {
        console.error('[AuthContext] Failed to get session:', err);
        updateSession(null);
      });

    // Step 2: Set up listener for future auth changes
    // 
    // CRITICAL: Keep callback SYNCHRONOUS (no async keyword) to avoid deadlocks
    // Performing async operations directly in this callback can cause Supabase
    // calls to hang indefinitely. Always defer async work using setTimeout.
    // 
    // See: https://github.com/supabase/auth-js/issues/762
    console.log('[AuthContext] Setting up auth state change listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event, { hasSession: !!session, userId: session?.user?.id });
      
      // Update state synchronously - this is safe and fast
      updateSession(session);

      // Defer ALL async operations to prevent deadlocks
      // Using setTimeout(..., 0) moves async work to next event loop tick
      setTimeout(() => {
        // Clean up URL after successful sign-in from magic link
        if (event === 'SIGNED_IN') {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hasAuthParams = hashParams.has('access_token') || hashParams.has('type');
          
          if (hasAuthParams) {
            console.log('[AuthContext] Cleaning up auth URL parameters');
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }

        // Track auth events with PostHog
        if (event === 'SIGNED_IN' && session?.user) {
          posthog.identify(session.user.id, {
            email: session.user.email,
          });
          
          // Only send welcome email for NEW users (not returning users)
          // New users have created_at ≈ last_sign_in_at (within 60 seconds)
          if (isNewUser(session.user)) {
            console.log('[AuthContext] New user detected, triggering welcome flow');
            
            // Add user to Resend general audience and send welcome email
            supabase.functions.invoke('add-user-to-audience', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: {
                email: session.user.email,
              },
            })
              .then(({ error }) => {
                if (error) {
                  console.warn('Failed to add user to audience (non-critical):', error);
                } else {
                  console.log('✅ User added to audience and welcome email sent');
                }
              })
              .catch((err) => {
                console.warn('Error adding user to audience (non-critical):', err);
              });
          } else {
            console.log('[AuthContext] Returning user detected, skipping welcome flow');
          }
        } else if (event === 'SIGNED_OUT') {
          posthog.reset();
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] Session token refreshed successfully');
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string) => {
    const redirectUrl = getAuthRedirectUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

