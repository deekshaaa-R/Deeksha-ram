import { useEffect, useRef, useState } from 'react';
import {
  computeCounterProgress,
  easeOutCubic,
  formatCounterValue,
} from '../utils/counterLogic';

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  decimals?: number;
}

export function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  durationMs = 700,
  decimals = 0,
}: AnimatedCounterProps) {
  const [value, setValue] = useState<number>(target);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      setHasAnimated(true);
      return;
    }

    let rafId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasAnimated(true);
          const start = performance.now();
          const step = (now: number) => {
            const progress = computeCounterProgress(now - start, durationMs);
            const eased = easeOutCubic(progress);
            setValue(target * eased);
            if (progress < 1) {
              rafId = requestAnimationFrame(step);
            } else {
              setValue(target);
            }
          };
          rafId = requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, durationMs, hasAnimated]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatCounterValue(value, decimals, prefix, suffix)}
    </span>
  );
}
