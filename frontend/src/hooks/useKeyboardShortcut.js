import { useEffect } from 'react';

export default function useKeyboardShortcut(key, callback, options = {}) {
  const { ctrl = false, shift = false, alt = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (e.repeat) return;
      if (ctrl && !e.ctrlKey && !e.metaKey) return;
      if (!ctrl && (e.ctrlKey || e.metaKey)) return;
      if (shift && !e.shiftKey) return;
      if (alt && !e.altKey) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      e.preventDefault();
      e.stopPropagation();
      callback(e);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback, ctrl, shift, alt, enabled]);
}
