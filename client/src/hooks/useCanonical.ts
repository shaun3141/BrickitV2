import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { updateCanonicalForRoute } from '@/utils/seo';

/**
 * Hook to automatically update canonical tag when route changes
 */
export function useCanonical() {
  const location = useLocation();

  useEffect(() => {
    updateCanonicalForRoute(location.pathname);
  }, [location.pathname]);
}

