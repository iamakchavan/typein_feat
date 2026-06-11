import { useEffect, useRef } from 'react';

interface UseAppleScrollOptions {
  getScrollContainer: () => HTMLElement | null;
  getCaretRect: () => { top: number; bottom: number } | null;
  bottomMargin?: number; // threshold from bottom of viewport, default 220
}

export function useAppleScroll({
  getScrollContainer,
  getCaretRect,
  bottomMargin = 220,
}: UseAppleScrollOptions) {
  const targetScrollTop = useRef<number | null>(null);
  const animFrameId = useRef<number | null>(null);
  const isProgrammaticScrolling = useRef(false);
  const velocity = useRef(0);

  useEffect(() => {
    const animateScroll = () => {
      const container = getScrollContainer();
      if (!container || targetScrollTop.current === null) {
        animFrameId.current = null;
        velocity.current = 0;
        return;
      }

      const current = container.scrollTop;
      const target = targetScrollTop.current;
      
      // Spring constants: soft stiffness (0.05) and high damping (0.75) for fluid, Apple-style cushioned motion
      const stiffness = 0.05;
      const damping = 0.75;
      
      const force = stiffness * (target - current);
      velocity.current = (velocity.current + force) * damping;
      
      const nextScroll = current + velocity.current;

      // Snap to target if very close and speed is low
      if (Math.abs(target - nextScroll) < 0.3 && Math.abs(velocity.current) < 0.05) {
        isProgrammaticScrolling.current = true;
        container.scrollTop = target;
        isProgrammaticScrolling.current = false;
        targetScrollTop.current = null;
        animFrameId.current = null;
        velocity.current = 0;
      } else {
        isProgrammaticScrolling.current = true;
        container.scrollTop = nextScroll;
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

        // Hysteresis deadband: ignore tiny sub-pixel adjustments (3px) to prevent micro-stuttering
        if (scrollDiff > 3) {
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
      }
    };

    // If user manual scrolls, cancel the animation loop immediately to prevent scroll fight
    const handleScroll = () => {
      if (!isProgrammaticScrolling.current) {
        targetScrollTop.current = null;
        velocity.current = 0;
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
