import { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/env';
import { posthog } from '@/lib/posthog';

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
    // Get initial session from localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Track auth events with PostHog
      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
        });
        
        // Add user to Resend general audience on signup/first login
        try {
          // Call edge function to add user to general audience
          // This is fire-and-forget - we don't block on it
          const { error } = await supabase.functions.invoke('add-user-to-audience', {
            body: {
              userId: session.user.id,
              email: session.user.email,
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
      }
    });

    return () => subscription.unsubscribe();
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

