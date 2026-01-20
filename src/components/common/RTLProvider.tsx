import React, { useEffect, useState } from 'react';
import { RTLContext } from '../../hooks/useRTL';

interface RTLProviderProps {
  children: React.ReactNode;
  defaultDirection?: 'rtl' | 'ltr';
}

/**
 * RTL Provider for Hebrew-first layout
 * Handles document direction and provides context for RTL-aware components
 */
export const RTLProvider: React.FC<RTLProviderProps> = ({ 
  children, 
  defaultDirection = 'rtl' 
}) => {
  // Initialize from localStorage if available
  const [direction, setDirection] = useState<'rtl' | 'ltr'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-direction') as 'rtl' | 'ltr' | null;
      return saved || defaultDirection;
    }
    return defaultDirection;
  });

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = direction;
    document.documentElement.lang = direction === 'rtl' ? 'he' : 'en';
    
    // Store preference
    localStorage.setItem('app-direction', direction);
  }, [direction]);

  const value = {
    isRTL: direction === 'rtl',
    direction,
    setDirection,
  };

  return (
    <RTLContext.Provider value={value}>
      {children}
    </RTLContext.Provider>
  );
};

export default RTLProvider;
