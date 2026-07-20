import { useEffect, useCallback } from 'react';
import Portal from './Portal';
import useScrollLock from '../hooks/useScrollLock';
import useFocusTrap from '../hooks/useFocusTrap';

export default function Modal({ open, onClose, width, children, 'aria-label': ariaLabel }) {
  useScrollLock(open);
  const trapRef = useFocusTrap(open);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape' && onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <div className="modal-content" ref={trapRef} style={width ? { width, maxWidth: '90%' } : undefined} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </Portal>
  );
}
