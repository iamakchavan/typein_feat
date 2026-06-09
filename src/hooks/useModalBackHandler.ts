import { useEffect, useRef } from 'react';

// Global state for back-button modal navigation
const modalRegistry: Array<() => void> = [];
let ignoreNextPop = 0;
let isListenerAdded = false;

const handlePopState = () => {
  if (ignoreNextPop > 0) {
    ignoreNextPop--;
    return;
  }

  if (modalRegistry.length > 0) {
    const closeTopModal = modalRegistry.pop();
    if (closeTopModal) {
      closeTopModal();
    }
  }
};

export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  // Store onClose in a ref to prevent effect cleanup/re-run when onClose reference changes
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Only run on mobile clients
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (!isMobile) return;

    if (!isOpen) return;

    // Set up global listener if not already done
    if (!isListenerAdded) {
      window.addEventListener('popstate', handlePopState);
      isListenerAdded = true;
    }

    // Define this modal's close callback using the ref
    const closeCallback = () => {
      onCloseRef.current();
    };

    // Push state and register callback
    window.history.pushState({ typeinModal: true }, '');
    modalRegistry.push(closeCallback);

    return () => {
      // Find and remove this callback from registry
      const index = modalRegistry.indexOf(closeCallback);
      if (index !== -1) {
        modalRegistry.splice(index, 1);
        
        // If we are cleaning up because of manual close (and not because the popstate handler popped us),
        // we need to remove the pushed history state by going back.
        ignoreNextPop++;
        window.history.back();
      }
    };
  }, [isOpen]);
}
