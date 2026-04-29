import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

/**
 * Only attaches <img src> once the thumb is near the viewport so the grid does not start
 * one network request per receipt at once (which can stall as many “pending” Img rows).
 */
export function LazyReceiptThumb({
  src,
  alt = "",
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { rootMargin: "200px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative h-full w-full ${className}`}>
      {!shouldLoad ? (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" aria-hidden />
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      )}
    </div>
  );
}
