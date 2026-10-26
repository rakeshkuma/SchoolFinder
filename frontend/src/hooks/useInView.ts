import { useCallback, useEffect, useState } from 'react';

/**
 * True once the element comes within `margin` of the viewport (and stays true). Used to download heavy, below-the-fold
 * parts (e.g. the charts library) only for visitors who scroll to them. Without IntersectionObserver it is true at once.
 * `ref` is a callback ref, so it also works for elements that appear later (e.g. after their data loads).
 */
export function useInView<T extends Element>(margin = '300px') {
  const [element, setElement] = useState<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  const ref = useCallback((node: T | null) => setElement(node), []);
  useEffect(() => {
    if (inView || !element) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin: margin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, inView, margin]);
  return { ref, inView };
}
