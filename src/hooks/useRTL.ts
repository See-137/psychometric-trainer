import { useContext, createContext } from 'react';

interface RTLContextValue {
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
  setDirection: (dir: 'rtl' | 'ltr') => void;
}

export const RTLContext = createContext<RTLContextValue>({
  isRTL: true,
  direction: 'rtl',
  setDirection: () => {},
});

export function useRTL() {
  return useContext(RTLContext);
}

/**
 * Hook for RTL-aware styling
 * Returns CSS classes that flip for RTL layout
 */
export function useRTLStyles() {
  const { isRTL } = useRTL();

  return {
    // Margin/Padding start (right in RTL, left in LTR)
    ms: isRTL ? 'mr' : 'ml',
    ps: isRTL ? 'pr' : 'pl',
    
    // Margin/Padding end (left in RTL, right in LTR)  
    me: isRTL ? 'ml' : 'mr',
    pe: isRTL ? 'pl' : 'pr',
    
    // Border start/end
    borderStart: isRTL ? 'border-r' : 'border-l',
    borderEnd: isRTL ? 'border-l' : 'border-r',
    
    // Position start/end
    start: isRTL ? 'right' : 'left',
    end: isRTL ? 'left' : 'right',
    
    // Flex direction helpers
    flexRowStart: isRTL ? 'flex-row-reverse' : 'flex-row',
    
    // Text alignment
    textStart: isRTL ? 'text-right' : 'text-left',
    textEnd: isRTL ? 'text-left' : 'text-right',
  };
}
