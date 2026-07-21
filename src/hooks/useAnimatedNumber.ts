import { useEffect, useRef, useState } from "react";

// ease-out-premium curve (matches --ease-premium in styles.css) sampled as a JS cubic-bezier approximation
function easeOutPremium(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a numeric value from its previous value to `target` over `duration` ms.
 * Skips the animation entirely (snaps to target) on first mount and when the user
 * has `prefers-reduced-motion` enabled.
 */
export function useAnimatedNumber(target: number, duration = 700): number {
  const [displayValue, setDisplayValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      fromRef.current = target;
      setDisplayValue(target);
      return;
    }
    if (!Number.isFinite(target)) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      fromRef.current = target;
      setDisplayValue(target);
      return;
    }

    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutPremium(progress);
      setDisplayValue(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayValue;
}
