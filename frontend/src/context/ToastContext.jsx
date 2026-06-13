import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const ToastContext = createContext(null);

function ToastItem({ toast, duration, onRemove }) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const frameRef = useRef(null);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [duration]);

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
      <button className="toast-close" onClick={() => onRemove(toast.id)}>&times;</button>
      <div className="toast-progress"><div className="toast-progress-bar" style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ add, remove, success: (m) => add(m, 'success'), error: (m) => add(m, 'error'), warning: (m) => add(m, 'warning'), info: (m) => add(m, 'info') }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} duration={t.duration} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
