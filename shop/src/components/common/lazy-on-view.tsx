import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Renders its children only once the placeholder scrolls near the viewport. Below-the-fold
 * home sections are wrapped in this so their JS + data fetches don't all fire on first paint —
 * the page shows the top 2–3 sections instantly and streams the rest in as the shopper scrolls.
 * A reserved min-height keeps the scrollbar/layout stable before a section mounts.
 */
export default function LazyOnView({
  children,
  minHeight = 320,
  rootMargin = '500px',
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
