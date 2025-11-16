import { useState, useEffect } from 'react';
import { User as UserIcon, LogOut, Mail, Heart, Image as ImageIcon, Edit2, Check, Trash2, Globe, Lock } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { listUserCreations, deleteCreation, loadCreation } from '@/services/creation.service';
import { redirectToCheckout } from '@/lib/stripe';
import { trackEvent } from '@/services/analytics.service';
import { toast } from '@/lib/toast';
import type { Creation } from '@/types';

interface ProfilePageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadCreation?: (creation: Creation) => void;
}

export function ProfileDialog({ open, onOpenChange, onLoadCreation }: ProfilePageProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('creations');
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoadingCreations, setIsLoadingCreations] = useState(false);
  const [showCustomAmountDialog, setShowCustomAmountDialog] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [donationStats, setDonationStats] = useState<{ count: number; total: number } | null>(null);
  const [loadingCreationId, setLoadingCreationId] = useState<string | null>(null);

  // Load user profile and creations
  useEffect(() => {
    if (user && open) {
      loadProfile();
      loadCreations();
      loadDonationStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, open]);

  const getDefaultDisplayName = () => {
    if (!user?.email) return '';
    return user.email.split('@')[0];
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is okay
      console.error('Error loading profile:', error);
      return;
    }

    // If data exists but display_name is null, use default; otherwise use the stored value
    if (data) {
      setDisplayName(data.display_name || '');
    } else {
      // Profile doesn't exist yet (shouldn't happen with auto-creation, but just in case)
      setDisplayName('');
    }
  };

  const saveDisplayName = async () => {
    if (!user || !displayName.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
        });

      if (error) throw error;
      setIsEditingName(false);
      toast.success('Display name saved successfully!');
    } catch (error) {
      console.error('Error saving display name:', error);
      toast.error('Failed to save display name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadCreations = async () => {
    console.log('[ProfilePage.loadCreations] Starting, user:', user?.id);
    if (!user) {
      console.log('[ProfilePage.loadCreations] No user, exiting');
      return;
    }

    setIsLoadingCreations(true);
    try {
      console.log('[ProfilePage.loadCreations] Calling listUserCreations');
      const { data, error } = await listUserCreations(user.id);
      if (error) throw error;
      console.log('[ProfilePage.loadCreations] Got data:', data?.length, 'creations');
      setCreations(data || []);
    } catch (error) {
      console.error('[ProfilePage.loadCreations] Error:', error);
    } finally {
      setIsLoadingCreations(false);
    }
  };

  const loadDonationStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_donation_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is okay (no donations yet)
        console.error('Error loading donation stats:', error);
        return;
      }

      if (data) {
        setDonationStats({
          count: data.donation_count,
          total: data.total_amount_cents,
        });
      }
    } catch (error) {
      console.error('Error loading donation stats:', error);
    }
  };

  const handleLoadCreation = async (creation: Creation) => {
    console.log('[ProfileDialog] Loading creation:', creation.id);
    setLoadingCreationId(creation.id);
    
    try {
      // Fetch the full creation with reconstructed pixel_data
      const { data: fullCreation, error } = await loadCreation(creation.id);
      
      if (error || !fullCreation) {
        console.error('[ProfileDialog] Error loading creation:', error);
        toast.error(`Failed to load creation: ${error?.message || 'Unknown error'}`);
        return;
      }
      
      console.log('[ProfileDialog] Successfully loaded creation');
      onLoadCreation?.(fullCreation);
      onOpenChange(false);
    } catch (error) {
      console.error('[ProfileDialog] Unexpected error:', error);
      toast.error(`Failed to load creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingCreationId(null);
    }
  };

  const handleDeleteCreation = async (creationId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this creation? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await deleteCreation(creationId);
      if (error) throw error;
      
      // Refresh the creations list
      await loadCreations();
      toast.success('Creation deleted successfully!');
    } catch (error) {
      console.error('Error deleting creation:', error);
      toast.error('Failed to delete creation. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    window.location.reload();
  };

  const handleDonate = async (amountInDollars: number) => {
    setIsProcessingPayment(true);
    try {
      // Convert dollars to cents for Stripe
      const amountInCents = Math.round(amountInDollars * 100);
      
      // Track donation initiation
      trackEvent('donation_initiated', {
        amount: amountInDollars,
        user_id: user?.id,
      });
      
      await redirectToCheckout(amountInCents, user?.id);
      // Reset loading state immediately since we're opening in a new tab
      setIsProcessingPayment(false);
    } catch (error) {
      console.error('Error processing donation:', error);
      toast.error('Failed to process donation. Please try again.');
      setIsProcessingPayment(false);
      
      // Track donation failure
      trackEvent('donation_failed', {
        amount: amountInDollars,
        error: String(error),
      });
    }
  };

  const handleCustomAmountSubmit = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error('Please enter a valid amount of at least $1');
      return;
    }
    if (amount > 999999) {
      toast.error('Maximum donation amount is $999,999');
      return;
    }
    setShowCustomAmountDialog(false);
    handleDonate(amount);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Manage your BrickIt account and creations
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="creations">
              <ImageIcon className="h-4 w-4 mr-2" />
              My Creations
            </TabsTrigger>
            <TabsTrigger value="profile">
              <UserIcon className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="donate">
              <Heart className="h-4 w-4 mr-2" />
              Donate
            </TabsTrigger>
          </TabsList>

          {/* My Creations Tab */}
          <TabsContent value="creations" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your saved LEGO mosaic creations will appear here.
              </p>
              
              {isLoadingCreations ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading your creations...</p>
                </div>
              ) : creations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-fit mb-4">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    No creations yet. Create your first mosaic to see it saved here!
                  </p>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Create a Mosaic
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {creations.map((creation) => {
                    return (
                      <Card key={creation.id} className="overflow-hidden group">
                        <div className="aspect-square bg-muted/30 relative">
                          {creation.rendered_image_url || creation.preview_image_url ? (
                            <img
                              src={`${creation.rendered_image_url || creation.preview_image_url}?t=${new Date(creation.updated_at).getTime()}`}
                              alt={creation.title}
                              className="w-full h-full object-contain"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            {creation.sharing_status === 'gallery' ? (
                              <div className="bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Gallery
                              </div>
                            ) : creation.sharing_status === 'link' ? (
                              <div className="bg-blue-500/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Link
                              </div>
                            ) : (
                              <div className="bg-muted/90 text-muted-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Private
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold truncate">{creation.title}</h3>
                          {creation.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {creation.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {creation.width} × {creation.height} studs
                          </p>
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleLoadCreation(creation)}
                              disabled={loadingCreationId === creation.id}
                            >
                              {loadingCreationId === creation.id ? 'Loading...' : 'Load'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCreation(creation.id)}
                              disabled={loadingCreationId === creation.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-6">
              {/* User Info Section */}
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <UserIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    {donationStats && donationStats.count > 0 && (
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-full px-3 py-1">
                        <Heart className="h-4 w-4 text-pink-500" fill="currentColor" />
                        <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">
                          Supporter
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ${(donationStats.total / 100).toFixed(2)} total
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Display Name</p>
                      <div className="flex items-center gap-2 mt-1">
                        {isEditingName ? (
                          <>
                            <Input
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder={getDefaultDisplayName()}
                              className="max-w-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveDisplayName();
                                } else if (e.key === 'Escape') {
                                  setIsEditingName(false);
                                  loadProfile();
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={saveDisplayName}
                              disabled={isSaving || !displayName.trim()}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingName(false);
                                loadProfile();
                              }}
                              disabled={isSaving}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-base">{displayName || getDefaultDisplayName()}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsEditingName(true)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Account Settings */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about your creations
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t">
                    <div>
                      <p className="font-medium">Privacy Settings</p>
                      <p className="text-sm text-muted-foreground">
                        Manage who can see your creations
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Sign Out Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Donate Tab */}
          <TabsContent value="donate" className="space-y-4">
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-primary/10 p-4 rounded-full">
                      <Heart className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Support BrickIt</h3>
                    <p className="text-muted-foreground">
                      Help keep BrickIt free and awesome for everyone!
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Why Donate?</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                      <div className="h-2 w-2 bg-primary rounded-full" />
                    </div>
                    <div>
                      <p className="font-medium">Keep the servers running</p>
                      <p className="text-sm text-muted-foreground">
                        Your donations help cover hosting and infrastructure costs
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                      <div className="h-2 w-2 bg-primary rounded-full" />
                    </div>
                    <div>
                      <p className="font-medium">Fund new features</p>
                      <p className="text-sm text-muted-foreground">
                        Enable development of exciting new capabilities
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                      <div className="h-2 w-2 bg-primary rounded-full" />
                    </div>
                    <div>
                      <p className="font-medium">Support the community</p>
                      <p className="text-sm text-muted-foreground">
                        Help maintain a free tool for LEGO enthusiasts worldwide
                      </p>
                    </div>
                  </li>
                </ul>
              </Card>

              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => handleDonate(5)}
                  disabled={isProcessingPayment}
                >
                  <span className="text-2xl font-bold">$5</span>
                  <span className="text-xs text-muted-foreground">Coffee</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => handleDonate(10)}
                  disabled={isProcessingPayment}
                >
                  <span className="text-2xl font-bold">$10</span>
                  <span className="text-xs text-muted-foreground">Lunch</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => handleDonate(25)}
                  disabled={isProcessingPayment}
                >
                  <span className="text-2xl font-bold">$25</span>
                  <span className="text-xs text-muted-foreground">Supporter</span>
                </Button>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowCustomAmountDialog(true)}
                disabled={isProcessingPayment}
              >
                <Heart className="h-4 w-4 mr-2" />
                {isProcessingPayment ? 'Processing...' : 'Support with a Custom Amount'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                BrickIt is a labor of love. Your support means the world! ❤️
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Custom Amount Dialog */}
      <Dialog open={showCustomAmountDialog} onOpenChange={setShowCustomAmountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Donation Amount</DialogTitle>
            <DialogDescription>
              Enter your desired donation amount in USD
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label htmlFor="custom-amount" className="text-sm font-medium mb-2 block">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="custom-amount"
                  type="number"
                  min="1"
                  max="999999"
                  step="0.01"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-7"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomAmountSubmit();
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Minimum $1.00, Maximum $999,999
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCustomAmountSubmit}
                className="flex-1"
                disabled={!customAmount || isProcessingPayment}
              >
                <Heart className="h-4 w-4 mr-2" />
                {isProcessingPayment ? 'Processing...' : 'Donate'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomAmountDialog(false);
                  setCustomAmount('');
                }}
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

