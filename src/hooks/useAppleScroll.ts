import { useEffect, useRef } from 'react';

interface UseAppleScrollOptions {
  getScrollContainer: () => HTMLElement | null;
  getCaretRect: () => { top: number; bottom: number } | null;
  bottomMargin?: number; // threshold from bottom of viewport, default 180
}

export function useAppleScroll({
  getScrollContainer,
  getCaretRect,
  bottomMargin = 180,
}: UseAppleScrollOptions) {
  const targetScrollTop = useRef<number | null>(null);
  const animFrameId = useRef<number | null>(null);
  const isProgrammaticScrolling = useRef(false);

  useEffect(() => {
    const animateScroll = () => {
      const container = getScrollContainer();
      if (!container || targetScrollTop.current === null) {
        animFrameId.current = null;
        return;
      }

      const current = container.scrollTop;
      const target = targetScrollTop.current;
      const diff = target - current;

      // If we are extremely close to target (less than 0.5px), snap and finish
      if (Math.abs(diff) < 0.5) {
        isProgrammaticScrolling.current = true;
        container.scrollTop = target;
        isProgrammaticScrolling.current = false;
        targetScrollTop.current = null;
        animFrameId.current = null;
      } else {
        isProgrammaticScrolling.current = true;
        // 0.12 lerp factor for Apple-level soft and smooth deceleration
        container.scrollTop = current + diff * 0.12;
        isProgrammaticScrolling.current = false;
        animFrameId.current = requestAnimationFrame(animateScroll);
      }
    };

    const handleCaretPositionChange = () => {
      const container = getScrollContainer();
      const rect = getCaretRect();
      if (!container || !rect) return;

      const viewportHeight = window.innerHeight;
      const thresholdY = viewportHeight - bottomMargin;

      // If selection bottom goes below the threshold
      if (rect.bottom > thresholdY) {
        const scrollDiff = rect.bottom - thresholdY;
        const target = container.scrollTop + scrollDiff;

        // Ensure we don't try to scroll beyond scroll boundaries
        const maxScroll = container.scrollHeight - container.clientHeight;
        const cappedTarget = Math.min(target, maxScroll);

        if (cappedTarget > container.scrollTop) {
          targetScrollTop.current = cappedTarget;
          if (animFrameId.current === null) {
            animFrameId.current = requestAnimationFrame(animateScroll);
          }
        }
      }
    };

    // If user manual scrolls, cancel the animation loop immediately to prevent scroll fight
    const handleScroll = () => {
      if (!isProgrammaticScrolling.current) {
        targetScrollTop.current = null;
        if (animFrameId.current !== null) {
          cancelAnimationFrame(animFrameId.current);
          animFrameId.current = null;
        }
      }
    };

    // selectionchange tracks typing, cursor arrows, focus events, click clicks
    document.addEventListener('selectionchange', handleCaretPositionChange);

    // Get the container to listen to scroll events
    const container = getScrollContainer();
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      document.removeEventListener('selectionchange', handleCaretPositionChange);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [getScrollContainer, getCaretRect, bottomMargin]);
}
