import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Prevents accidental rapid double-taps on navigation/launch CTAs.
 * Automatically resets after `delayMs` and cleans up pending timers on unmount.
 */
export function useActionLock(delayMs = 450) {
  const lockRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lockRef.current = false;
    };
  }, []);

  const runLocked = useCallback(
    (action: () => void) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setIsLocked(true);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      try {
        action();
      } finally {
        timerRef.current = window.setTimeout(() => {
          lockRef.current = false;
          timerRef.current = null;
          setIsLocked(false);
        }, delayMs);
      }
    },
    [delayMs],
  );

  return { isLocked, runLocked };
}
