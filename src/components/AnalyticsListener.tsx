import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * SPA navigations: `gtag('event', 'page_view', …)` only (never `config` for route changes).
 * First run records baseline pathname only — initial page_view comes from index.html.
 */
export default function AnalyticsListener() {
  const { pathname } = useLocation();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousPathRef.current === null) {
      previousPathRef.current = pathname;
      return;
    }

    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;

    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
