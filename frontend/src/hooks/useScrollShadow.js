import { useEffect, useRef, useState } from 'react';

export default function useScrollShadow() {
  const ref = useRef(null);
  const [scrolledLeft, setScrolledLeft] = useState(false);
  const [scrolledRight, setScrolledRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setScrolledLeft(el.scrollLeft > 4);
      setScrolledRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return { ref, scrolledLeft, scrolledRight };
}
