import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Heart, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/services/analytics.service';

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
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white" role="banner" aria-label="Donation banner">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link 
            to="/donate" 
            className="flex items-center gap-2 flex-1 hover:opacity-90 transition-opacity"
            onClick={() => trackEvent('donation_banner_clicked')}
          >
            <Heart className="h-5 w-5 flex-shrink-0" fill="currentColor" aria-hidden="true" />
            <p className="text-sm md:text-base">
              <strong>This app is completely free.</strong>{' '}
              <span className="hidden sm:inline">Any donation you choose to make supports coding education for kids in underrepresented communities.</span>
              <span className="inline sm:hidden">Support coding education for kids.</span>
            </p>
            <ArrowRight className="h-4 w-4 flex-shrink-0 hidden sm:block" aria-hidden="true" />
          </Link>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss donation banner"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

