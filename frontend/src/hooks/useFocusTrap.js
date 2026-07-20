import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function useFocusTrap(active) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    const prevFocus = document.activeElement;

    const focusables = () => [...container.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    const first = () => focusables()[0];
    const last = () => focusables()[focusables().length - 1];

    first()?.focus();

    const handler = (e) => {
      if (e.key !== 'Tab' || focusables().length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first()) {
          e.preventDefault();
          last()?.focus();
        }
      } else {
        if (document.activeElement === last()) {
          e.preventDefault();
          first()?.focus();
        }
      }
    };

    container.addEventListener('keydown', handler);
    return () => {
      container.removeEventListener('keydown', handler);
      prevFocus?.focus();
    };
  }, [active]);

  return ref;
}
