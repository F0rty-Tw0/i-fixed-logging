'use client';

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 150,
}) => {
  const isTest =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  const shouldAnimate = duration > 0 && !isTest;

  const [displayCount, setDisplayCount] = useState(value);
  const rafRef = useRef<number>(0);
  const currentDisplayValueRef = useRef(value);

  useEffect(() => {
    if (!shouldAnimate) {
      currentDisplayValueRef.current = value;
      return;
    }

    const startValue = currentDisplayValueRef.current;
    const endValue = value;

    if (startValue === endValue) return;

    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Simple ease out
      const bit = 1 - Math.pow(1 - progress, 2);
      const current = Math.floor(startValue + (endValue - startValue) * bit);

      setDisplayCount(current);
      currentDisplayValueRef.current = current;

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      }
    };

    rafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, shouldAnimate]);

  // If animations are disabled, just show the raw value
  // This bypasses the state lag entirely
  const finalValue = shouldAnimate ? displayCount : value;

  return <>{finalValue.toLocaleString()}</>;
};
