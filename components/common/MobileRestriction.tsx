'use client';

import { useEffect, useState } from 'react';

export function MobileRestriction({ children }: { children: React.ReactNode }) {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check if device is mobile or tablet
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
      return mobileRegex.test(userAgent);
    };

    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024 || checkMobile());
    };

    // Initial check
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Return loading state if not yet client-side
  if (!isClient) return null;

  // Return message for mobile/tablet users
  if (isMobileOrTablet) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white p-6 z-50">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Desktop Only</h1>
          <p className="text-gray-700 mb-6">
            We apologize, but this website is not optimized for mobile or tablet devices at the moment.
          </p>
          <p className="text-gray-700">
            Please visit us on a desktop computer for the best experience.
          </p>
        </div>
      </div>
    );
  }

  // Return children for desktop users
  return <>{children}</>;
} 