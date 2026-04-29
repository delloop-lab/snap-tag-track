// Minimal service worker: do NOT intercept Supabase/storage image requests.
// The previous receipt-images worker used cache.put() on cross‑origin signed URLs,
// which can leave image requests permanently "pending" in DevTools.
const LEGACY_CACHE_NAMES = ["receipt-images-v2"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => {
        // Remove old broken cache that could poison future installs
        if (LEGACY_CACHE_NAMES.includes(n) || n.startsWith("receipt-images")) {
          return caches.delete(n);
        }
        return undefined;
      }))
    ).then(() => self.clients.claim())
  );
});
