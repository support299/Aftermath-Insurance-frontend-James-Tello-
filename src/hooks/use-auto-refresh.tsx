import { useEffect, useState } from "react";

/**
 * Returns a counter that increments every `intervalMs`.
 * Add it to a useEffect dependency array to trigger periodic re-fetches.
 * Pauses while the tab is hidden.
 */
export function useRefreshTick(intervalMs: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setTick((t) => t + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
