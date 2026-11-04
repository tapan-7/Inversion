'use client';

import { useState, useEffect } from 'react';

export function useOrientation(): { isPortrait: boolean; isTouch: boolean } {
  const [state, setState] = useState({
    isPortrait: false,
    isTouch: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const vv = window.visualViewport;
      const width = Math.floor(vv?.width ?? window.innerWidth);
      const height = Math.floor(vv?.height ?? window.innerHeight);
      const isPortrait = isTouch && height > width;

      setState({ isPortrait, isTouch });
    };

    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    window.visualViewport?.addEventListener('resize', check);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      window.visualViewport?.removeEventListener('resize', check);
    };
  }, []);

  return state;
}

