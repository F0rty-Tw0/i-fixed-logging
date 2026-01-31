'use client';

import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
}) => {
  const [displayCount, setDisplayCount] = useState(value);
  const rafRef = React.useRef<number>(0);
  const currentCountRef = React.useRef(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = currentCountRef.current;
    const endValue = value;

    if (startValue === endValue) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(
        progress * (endValue - startValue) + startValue,
      );

      setDisplayCount(current);
      currentCountRef.current = current;

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      }
    };

    rafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{displayCount.toLocaleString()}</>;
};
