import { useEffect, useRef } from 'react';

// A global stack of open modal IDs to ensure progressive, LIFO dismissal.
const modalStack: string[] = [];

// A global counter to bypass popstate event handling when we trigger a programmatic back operation (manual close).
let ignorePopStateCount = 0;

/**
 * A hook that registers a history state when a modal/sidebar is open.
 * If the user clicks the browser's back button or uses a hardware back gesture
 * on mobile, it will dismiss the modal instead of navigating away or exiting the app.
 *
 * @param isOpen - Whether the modal or sidebar is open
 * @param onClose - Callback to close the modal or sidebar
 * @param id - A unique ID for this modal type
 */
export function useModalHistory(isOpen: boolean, onClose: () => void, id: string) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    const stateId = `modal-${id}-${Date.now()}`;
    modalStack.push(stateId);

    // Push a state into browser history
    window.history.pushState({ modalId: stateId }, '');

    const handlePopState = () => {
      // If we are currently ignoring a programmatic popstate, decrement and skip
      if (ignorePopStateCount > 0) {
        ignorePopStateCount--;
        return;
      }

      // Back button was pressed, trigger the close callback ONLY if this is the topmost modal
      if (modalStack[modalStack.length - 1] === stateId) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // Remove from stack
      const index = modalStack.indexOf(stateId);
      if (index !== -1) {
        modalStack.splice(index, 1);
      }

      // If the modal was closed manually (not via popstate),
      // we remove the state we pushed to clean up history.
      if (window.history.state?.modalId === stateId) {
        ignorePopStateCount++;
        window.history.back();
      }
    };
  }, [isOpen, id]);
}

