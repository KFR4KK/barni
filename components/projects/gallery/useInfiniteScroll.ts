import { useEffect, useRef } from "react";

// Fires `onIntersect` when the returned ref's element scrolls into view
// — the sentinel div ProjectsGalleryClient renders after the last row of
// cards. Plain IntersectionObserver, no scroll-event listener/throttling
// of our own to maintain, and no library: this is the one thing the
// browser already does efficiently on its own.
export function useInfiniteScroll(onIntersect: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      // Starts loading the next page a bit before the sentinel is
      // actually on screen, so scrolling never visibly outruns loading.
      { rootMargin: "800px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return sentinelRef;
}
