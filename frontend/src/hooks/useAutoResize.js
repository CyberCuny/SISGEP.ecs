import { useEffect, useRef } from 'react';

export default function useAutoResize(dependency) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, [dependency]);
  return ref;
}
