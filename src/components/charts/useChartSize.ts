import { useEffect, useRef, useState } from "react";

/**
 * Tracks the width of a container element for responsive D3 SVGs.
 * Returns a ref to attach to the wrapper div + measured width.
 */
export function useChartSize<T extends HTMLElement = HTMLDivElement>(initial = 600) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(Math.floor(w));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
