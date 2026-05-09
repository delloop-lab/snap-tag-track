import { supabase } from "@/integrations/supabase/client";
import { siblingThumbStorageKey } from "@/lib/siblingThumbPath";

const RECEIPTS_BUCKET = "receipts";

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isRootRelativeUrl(value: string) {
  return /^\/(?!\/)/.test(value);
}

function extractObjectPathFromSupabaseUrl(urlValue: string): string | null {
  try {
    const parsed = new URL(urlValue);
    const signPrefix = `/storage/v1/object/sign/${RECEIPTS_BUCKET}/`;
    const publicPrefix = `/storage/v1/object/public/${RECEIPTS_BUCKET}/`;

    if (parsed.pathname.startsWith(signPrefix)) {
      return canonicalReceiptBucketObjectKey(
        decodeURIComponent(parsed.pathname.slice(signPrefix.length))
      );
    }
    if (parsed.pathname.startsWith(publicPrefix)) {
      return canonicalReceiptBucketObjectKey(
        decodeURIComponent(parsed.pathname.slice(publicPrefix.length))
      );
    }

    // Some signed URLs only expose bucket/key in the JWT payload `url` claim.
    const token = parsed.searchParams.get("token");
    if (token) {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          decodeURIComponent(
            atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
              .split("")
              .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
              .join("")
          )
        ) as { url?: string };
        if (payload.url) {
          return canonicalReceiptBucketObjectKey(payload.url);
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Object key relative to bucket `receipts` — strip leading slashes and any repeated `receipts/`
 * prefix (stored paths sometimes mistakenly contain `receipts/receipts/...`).
 */
export function canonicalReceiptBucketObjectKey(relativeOrPrefixed: string): string {
  let s = relativeOrPrefixed.trim().replace(/^\/+/, "");
  const bucketPrefix = new RegExp(`^${RECEIPTS_BUCKET}/`, "i");
  while (bucketPrefix.test(s)) {
    s = s.replace(bucketPrefix, "");
  }
  return s;
}

export function normalizeReceiptObjectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed) || isRootRelativeUrl(trimmed)) return trimmed;

  const canonical = canonicalReceiptBucketObjectKey(trimmed);
  return canonical || null;
}

function buildPathCandidates(path: string): string[] {
  const trimmed = path.trim();
  if (!trimmed) return [];
  if (isRootRelativeUrl(trimmed)) return [trimmed];
  if (isAbsoluteUrl(trimmed)) {
    const extracted = extractObjectPathFromSupabaseUrl(trimmed);
    if (!extracted) return [trimmed];
    const canonical = canonicalReceiptBucketObjectKey(extracted);
    return canonical
      ? Array.from(new Set([canonical, `${RECEIPTS_BUCKET}/${canonical}`]))
      : [trimmed];
  }

  const canonical = canonicalReceiptBucketObjectKey(trimmed);
  if (!canonical) return [];

  return Array.from(new Set([canonical, `${RECEIPTS_BUCKET}/${canonical}`]));
}

export async function resolveReceiptImageUrl(
  path: string | null | undefined,
  expirySeconds = 60 * 60
): Promise<string | null> {
  if (!path) return null;
  const candidates = buildPathCandidates(path);
  if (candidates.length === 0) return null;
  if (isAbsoluteUrl(candidates[0]) || isRootRelativeUrl(candidates[0])) return candidates[0];

  for (const candidate of candidates) {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(candidate, expirySeconds);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  console.warn("[receiptImageUrl] Failed to resolve image path", {
    original: path,
    candidates,
  });

  // Final fallback for public buckets.
  const normalized = normalizeReceiptObjectPath(path);
  if (!normalized) return null;
  const { data: publicData } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(normalized);
  return publicData?.publicUrl ?? null;
}

/** Variants Supabase accepts for the same blob (canonical key + legacy `receipts/`-prefixed). */
export function candidateStoragePathsForKey(objectKey: string): string[] {
  const canonical = canonicalReceiptBucketObjectKey(objectKey.trim());
  if (!canonical) return [];
  return Array.from(new Set([canonical, `${RECEIPTS_BUCKET}/${canonical}`]));
}

/** Canonical storage object key for the main receipt image (for sibling *_thumb naming). */
export function primaryReceiptObjectKey(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) {
    const extracted = extractObjectPathFromSupabaseUrl(trimmed);
    return extracted ? canonicalReceiptBucketObjectKey(extracted) || null : null;
  }
  return normalizeReceiptObjectPath(trimmed);
}

/**
 * Path variants to sign for `_thumb.*` sibling, from the canonical main key only — avoids probing
 * `receipts/receipts/...` paths and matches upload/backfill keys.
 */
function siblingThumbSigningCandidates(path: string | null | undefined): string[] {
  if (!path?.trim()) return [];
  const trimmed = path.trim();
  let pk =
    primaryReceiptObjectKey(path) ??
    (!isAbsoluteUrl(trimmed) ? canonicalReceiptBucketObjectKey(trimmed) || null : null);
  if (!pk) return [];
  pk = siblingThumbStorageKey(pk);
  return candidateStoragePathsForKey(pk);
}

/**
 * True if a pre-rendered *_thumb sibling already exists (not transform-only fallbacks).
 * Uses signed-URL probing only — avoids noisy `download()` GETs for missing thumbs.
 */
export async function receiptThumbnailSiblingExists(path: string | null | undefined): Promise<boolean> {
  const keys = siblingThumbSigningCandidates(path);
  for (const key of keys) {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(key, 30);
    if (!error && data?.signedUrl) return true;
  }
  return false;
}

/**
 * Receipt list thumbnails:
 * 1) Pre-rendered `_thumb.*` sibling in storage (tiny; works without Supabase Image Transform paid add-on)
 * 2) Supabase image transform URL (needs project image transforms)
 * 3) Full-resolution signed URL (slow/large fallback)
 */
export async function resolveReceiptThumbUrl(
  path: string | null | undefined,
  expirySeconds = 60 * 60
): Promise<string | null> {
  if (!path) return null;
  const candidates = buildPathCandidates(path);
  if (candidates.length === 0) return null;
  if (isRootRelativeUrl(candidates[0])) return candidates[0];

  for (const candidate of siblingThumbSigningCandidates(path)) {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(candidate, expirySeconds);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  const transform = {
    width: 320,
    height: 427,
    resize: "cover" as const,
    quality: 75,
  };

  if (isAbsoluteUrl(candidates[0])) {
    const extracted = extractObjectPathFromSupabaseUrl(candidates[0]);
    const pathCandidates = extracted ? [extracted] : [];
    for (const candidate of pathCandidates) {
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrl(candidate, expirySeconds, { transform });
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    return candidates[0];
  }

  for (const candidate of candidates) {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(candidate, expirySeconds, { transform });
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return resolveReceiptImageUrl(path, expirySeconds);
}
