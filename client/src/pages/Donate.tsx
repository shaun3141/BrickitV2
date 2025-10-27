import { useState } from 'react';
import { Heart, Code, Users, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { LoginButton } from '@/features/auth/LoginButton';
import { redirectToCheckout } from '@/lib/stripe';
import { trackEvent } from '@/services/analytics.service';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function Donate() {
  const { user } = useAuth();
  const [showCustomAmountDialog, setShowCustomAmountDialog] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  return (
    <SiteLayout
      headerActions={user ? undefined : <LoginButton />}
    >
      <div className="max-w-4xl mx-auto py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-medium text-gray-700">
              Making a Difference, One Brick at a Time
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Support BrickIt
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Help us bring coding education to kids in underrepresented communities while keeping BrickIt free for everyone.
          </p>
        </div>

        {/* Login Prompt for Non-Users */}
        {!user && (
          <Card className="p-8 mb-12 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Heart className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Sign In to Donate</h2>
                <p className="text-muted-foreground mb-6">
                  Create an account or sign in to support BrickIt and track your contribution to coding education.
                </p>
                <LoginButton />
              </div>
            </div>
          </Card>
        )}

        {/* Value Props Section */}
        <Card className="p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Your Donation Supports</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shrink-0">
                <Code className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Coding Education</h3>
                <p className="text-muted-foreground">
                  Your donations fund coding workshops and after-school programs for kids in underserved communities, helping bridge the digital divide.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Free Access for All</h3>
                <p className="text-muted-foreground">
                  Keep BrickIt free and accessible to everyone. No paywalls, no limits—just unlimited creativity for LEGO enthusiasts worldwide.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-3 rounded-xl shrink-0">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Real-World Impact</h3>
                <p className="text-muted-foreground">
                  Support STEM education initiatives that inspire the next generation of builders, creators, and innovators.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Sustainable Impact</h3>
                <p className="text-muted-foreground">
                  Your donations ensure these programs can continue year after year, providing consistent support for students on their coding journey.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Donation Options */}
        {user && (
          <>
            <Card className="p-8 mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <Heart className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Thank You for Your Support!</h3>
                  <p className="text-muted-foreground">
                    Your generosity helps make coding education accessible and keeps BrickIt free for everyone.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={() => handleDonate(5)}
                disabled={isProcessingPayment}
              >
                <span className="text-3xl font-bold">$5</span>
                <span className="text-xs text-muted-foreground">Coffee</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={() => handleDonate(10)}
                disabled={isProcessingPayment}
              >
                <span className="text-3xl font-bold">$10</span>
                <span className="text-xs text-muted-foreground">Lunch</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={() => handleDonate(25)}
                disabled={isProcessingPayment}
              >
                <span className="text-3xl font-bold">$25</span>
                <span className="text-xs text-muted-foreground">Supporter</span>
              </Button>
            </div>

            <Button 
              className="w-full mb-6" 
              size="lg"
              onClick={() => setShowCustomAmountDialog(true)}
              disabled={isProcessingPayment}
            >
              <Heart className="h-4 w-4 mr-2" />
              {isProcessingPayment ? 'Processing...' : 'Support with a Custom Amount'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              BrickIt is a labor of love. Your support helps bring coding education to underrepresented communities and keeps BrickIt free for everyone. ❤️
            </p>
          </>
        )}

        {/* Additional Info Card */}
        <Card className="p-6 mt-12">
          <h3 className="text-lg font-semibold mb-4">Transparency & Impact</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              💰 100% of donations go directly to coding education programs in underserved communities. BrickIt's infrastructure is fully covered.
            </p>
            <p>
              📚 Your donations fund coding workshops, after-school programs, and educational resources for kids who might not otherwise have access.
            </p>
            <p>
              🤝 Your contribution, no matter the size, helps us continue making a difference. Every dollar counts!
            </p>
          </div>
        </Card>
      </div>

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
    </SiteLayout>
  );
}

