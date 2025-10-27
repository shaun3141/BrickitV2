import { useState, useEffect } from 'react';
import { Save, Mail, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from '@/lib/toast';

interface SaveCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; description?: string; isPublic: boolean }) => Promise<void>;
  defaultTitle?: string;
  existingCreation?: boolean;
}

export function SaveCreationDialog({
  open,
  onOpenChange,
  onSave,
  defaultTitle = '',
  existingCreation = false,
}: SaveCreationDialogProps) {
  const { user, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setTitle(defaultTitle);
      setDescription('');
      setIsPublic(false);
      setEmailSent(false);
      setShowAuthForm(!user);
    }
  }, [open, user, defaultTitle]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await signInWithEmail(email);
      if (error) {
        toast.error(`Failed to send login link: ${error.message}`);
      } else {
        setEmailSent(true);
        toast.success('Login link sent! Check your email.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send login link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving creation:', error);
      toast.error('Failed to save creation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {showAuthForm ? (
          // Authentication Form
          <>
            <DialogHeader>
              <DialogTitle>Save Your Creation</DialogTitle>
              <DialogDescription>
                Create a free account to save your mosaic and access it anytime.
              </DialogDescription>
            </DialogHeader>

            {!emailSent ? (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send you a magic link to log in. No password needed!
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Magic Link
                    </>
                  )}
                </Button>

                <div className="text-center text-xs text-muted-foreground">
                  By continuing, you agree to our terms and privacy policy.
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-6">
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <Mail className="mx-auto h-12 w-12 text-primary mb-2" />
                  <p className="font-medium mb-1">Check your email!</p>
                  <p className="text-sm text-muted-foreground">
                    We sent a magic link to <strong>{email}</strong>
                  </p>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Click the link in your email to log in and save your creation.
                  You can close this dialog.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  Try Different Email
                </Button>
              </div>
            )}
          </>
        ) : (
          // Save Form (User is authenticated)
          <>
            <DialogHeader>
              <DialogTitle>
                {existingCreation ? 'Update Creation' : 'Save Creation'}
              </DialogTitle>
              <DialogDescription>
                {existingCreation
                  ? 'Update the details of your creation.'
                  : 'Give your mosaic a name and optionally share it with the community.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  type="text"
                  placeholder="My awesome LEGO mosaic"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  type="text"
                  placeholder="Add a description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">
                      Share with Community
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Make your creation publicly visible
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublic}
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isPublic ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !title.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {existingCreation ? 'Update' : 'Save'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

