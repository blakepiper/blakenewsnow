import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardHandlers {
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelect?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
  onSection?: (section: number) => void;
  onSettings?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Only handle Escape in inputs
      if (e.key === 'Escape') {
        target.blur();
        handlersRef.current.onEscape?.();
      }
      return;
    }

    const { key, ctrlKey, metaKey } = e;

    switch (key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        handlersRef.current.onNavigateDown?.();
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        handlersRef.current.onNavigateUp?.();
        break;

      case 'Enter':
        e.preventDefault();
        handlersRef.current.onSelect?.();
        break;

      case '/':
        e.preventDefault();
        handlersRef.current.onSearch?.();
        break;

      case 'Escape':
        e.preventDefault();
        handlersRef.current.onEscape?.();
        break;

      case '?':
        e.preventDefault();
        handlersRef.current.onHelp?.();
        break;

      case ',':
        if (ctrlKey || metaKey) {
          e.preventDefault();
          handlersRef.current.onSettings?.();
        }
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault();
        handlersRef.current.onSection?.(parseInt(key));
        break;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// Keyboard shortcuts data for help modal
export const KEYBOARD_SHORTCUTS = [
  { keys: ['j', '↓'], action: 'Next headline' },
  { keys: ['k', '↑'], action: 'Previous headline' },
  { keys: ['Enter'], action: 'Open selected article' },
  { keys: ['/'], action: 'Search' },
  { keys: ['Esc'], action: 'Close panel/modal' },
  { keys: ['?'], action: 'Show keyboard shortcuts' },
  { keys: ['1-5'], action: 'Jump to section' },
  { keys: ['Ctrl+,'], action: 'Open settings' },
];
