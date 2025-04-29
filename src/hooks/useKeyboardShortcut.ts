import { useEffect, useCallback } from 'react';

type KeyCombo = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

export function useKeyboardShortcut(
  keyCombo: KeyCombo | KeyCombo[],
  callback: (e: KeyboardEvent) => void,
  options: { preventDefault?: boolean } = {}
) {
  const { preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const combos = Array.isArray(keyCombo) ? keyCombo : [keyCombo];
      
      const matchesCombo = combos.some(combo => {
        const keyMatch = combo.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = combo.ctrlKey === undefined || combo.ctrlKey === event.ctrlKey;
        const metaMatch = combo.metaKey === undefined || combo.metaKey === event.metaKey;
        const shiftMatch = combo.shiftKey === undefined || combo.shiftKey === event.shiftKey;
        const altMatch = combo.altKey === undefined || combo.altKey === event.altKey;
        
        return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
      });
      
      if (matchesCombo) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    },
    [keyCombo, callback, preventDefault]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}