import { useState, useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import { trackEvent } from '@/lib/posthog';

export function DonationBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the banner has been dismissed
    const isDismissed = localStorage.getItem('donation-banner-dismissed');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('donation-banner-dismissed', 'true');
    trackEvent('donation_banner_dismissed');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Heart className="h-5 w-5 flex-shrink-0" fill="currentColor" />
            <p className="text-sm md:text-base">
              <strong>This app is completely free.</strong> Any donation you choose to make supports coding education for kids in underrepresented communities.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

