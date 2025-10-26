import { useState } from 'react';
import { LogIn, Mail, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ProfilePage } from './ProfilePage';
import type { Creation } from '@/types';

interface LoginButtonProps {
  onLoadCreation?: (creation: Creation) => void;
}

export function LoginButton({ onLoadCreation }: LoginButtonProps) {
  const { user, signInWithEmail } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await signInWithEmail(email);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      setSubmitted(true);
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setEmail('');
      setSubmitted(false);
      setError(null);
    }
  };

  if (user) {
    return (
      <>
        <Button onClick={() => setProfileOpen(true)} variant="outline" size="sm">
          <User className="h-4 w-4 mr-2" />
          Profile
        </Button>
        <ProfilePage 
          open={profileOpen} 
          onOpenChange={setProfileOpen}
          onLoadCreation={onLoadCreation}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <LogIn className="h-4 w-4 mr-2" />
          Login
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to BrickIt</DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a magic link to sign in.
          </DialogDescription>
        </DialogHeader>
        {!submitted ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                'Sending...'
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Magic Link
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="mb-4 text-green-600">
              <Mail className="h-12 w-12 mx-auto mb-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              Check your email! We've sent you a magic link to sign in.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

