import { useEffect, useRef } from 'react';

interface ModalInstance {
  id: string;
  onClose: () => void;
  stateIndex: number;
}

// Helper to access HMR-safe global state on the window object
function getGlobalState() {
  if (typeof window === 'undefined') {
    return {
      activeModals: [] as ModalInstance[],
      modalHistoryDepth: 0,
      isHandlingPopState: false,
      ignorePopStateCount: 0,
    };
  }

  const win = window as any;
  if (!win.__modalHistoryState) {
    win.__modalHistoryState = {
      activeModals: [] as ModalInstance[],
      modalHistoryDepth: 0,
      isHandlingPopState: false,
      ignorePopStateCount: 0,
    };
  }
  return win.__modalHistoryState as {
    activeModals: ModalInstance[];
    modalHistoryDepth: number;
    isHandlingPopState: boolean;
    ignorePopStateCount: number;
  };
}

// Set up popstate event listener on initial load
if (typeof window !== 'undefined') {
  const globalState = getGlobalState();

  // Clear any stale state from previous sessions (e.g., page reload)
  if (window.history.state?.isModal) {
    window.history.replaceState(null, '');
  }

  // Initialize the base state if it doesn't exist
  if (!window.history.state) {
    window.history.replaceState({ isModal: false, index: 0 }, '');
  }

  window.addEventListener('popstate', (event) => {
    if (globalState.ignorePopStateCount > 0) {
      globalState.ignorePopStateCount--;
      return;
    }

    const newStateIndex = event.state && typeof event.state.index === 'number'
      ? event.state.index
      : Math.max(0, globalState.modalHistoryDepth - 1);
    
    globalState.isHandlingPopState = true;
    
    if (newStateIndex < globalState.modalHistoryDepth) {
      const diff = globalState.modalHistoryDepth - newStateIndex;
      // Close the topmost modals in LIFO order
      for (let i = 0; i < diff; i++) {
        const modal = globalState.activeModals.pop();
        if (modal) {
          modal.onClose();
        }
      }
    }
    
    globalState.modalHistoryDepth = newStateIndex;
    globalState.isHandlingPopState = false;
  });
}

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

    const globalState = getGlobalState();
    
    // Increment index and set state Index
    globalState.modalHistoryDepth++;
    const stateIndex = globalState.modalHistoryDepth;

    const instance: ModalInstance = {
      id,
      onClose: () => onCloseRef.current(),
      stateIndex,
    };

    globalState.activeModals.push(instance);

    // Push new history state
    window.history.pushState({ isModal: true, index: stateIndex }, '');

    return () => {
      const globalState = getGlobalState();
      
      // Find and remove from global state
      const index = globalState.activeModals.findIndex((m) => m.stateIndex === stateIndex);
      if (index !== -1) {
        globalState.activeModals.splice(index, 1);

        // If we are unmounting because of a manual close (not via back button gesture),
        // we need to pop this state from browser history.
        if (!globalState.isHandlingPopState && stateIndex === globalState.modalHistoryDepth) {
          globalState.ignorePopStateCount++;
          globalState.modalHistoryDepth--;
          window.history.back();
        }
      }
    };
  }, [isOpen, id]);
}
