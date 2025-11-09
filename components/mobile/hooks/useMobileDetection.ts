"use client";

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current device is mobile
 * Returns true if window width < 768px or if user agent indicates mobile device
 * Handles SSR safely by returning false initially, then updating after mount
 * This prevents hydration mismatches
 */
export function useMobileDetection(): boolean {
  // Start with false to match server render, then update after mount
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setHasMounted(true);
    
    const checkMobile = () => {
      if (typeof window === 'undefined') return false;
      return (
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      );
    };

    // Update after mount to avoid hydration issues
    setIsMobile(checkMobile());
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Return false during SSR and initial render to prevent hydration mismatch
  // The actual mobile detection happens after mount
  return hasMounted ? isMobile : false;
}

