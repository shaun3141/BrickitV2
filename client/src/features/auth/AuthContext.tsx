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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth provider');

    // Listen for auth changes BEFORE getting session
    // This ensures we catch the SIGNED_IN event from URL parsing
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event);
      setSession(session);
      setUser(session?.user ?? null);
      setAuthSession(session);
      
      // Only set loading to false if we haven't already
      if (loading) {
        setLoading(false);
      }

      // Clean up URL after successful sign-in from magic link
      if (event === 'SIGNED_IN') {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasAuthParams = hashParams.has('access_token') || hashParams.has('type');
        
        if (hasAuthParams) {
          console.log('[AuthContext] Cleaning up auth URL parameters');
          // Remove the hash fragment from URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }

      // Track auth events with PostHog
      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
        });
        
        // Add user to Resend general audience on signup/first login
        try {
          // Call edge function to add user to general audience with auth token
          // This is fire-and-forget - we don't block on it
          const { error } = await supabase.functions.invoke('add-user-to-audience', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: {
              email: session.user.email,
              // firstName and lastName can be added if available from user metadata
            },
          });

          if (error) {
            console.warn('Failed to add user to audience (non-critical):', error);
          } else {
            console.log('✅ User added to audience');
          }
        } catch (err) {
          console.warn('Error adding user to audience (non-critical):', err);
        }
      } else if (event === 'SIGNED_OUT') {
        posthog.reset();
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Session token refreshed successfully');
      }
    });

    // Get initial session from localStorage or URL
    // The detectSessionInUrl flag will handle extracting session from URL hash
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        console.log('[AuthContext] Initial session result:', { hasSession: !!session, error });
        if (error) {
          console.error('Error loading session:', error);
          setSession(null);
          setUser(null);
          setAuthSession(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          setAuthSession(session);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to get session:', err);
        setSession(null);
        setUser(null);
        setAuthSession(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

