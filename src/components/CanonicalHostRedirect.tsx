import { useEffect } from "react";
import { CANONICAL_HOST } from "@/seo/site";

/**
 * Apex → www client backup. Primary enforcement: vercel.json redirects.
 */
export function CanonicalHostRedirect() {
  useEffect(() => {
    const { hostname, pathname, search, hash } = window.location;
    if (hostname !== "snaptagtrack.com") return;
    window.location.replace(`https://${CANONICAL_HOST}${pathname}${search}${hash}`);
  }, []);
  return null;
}
