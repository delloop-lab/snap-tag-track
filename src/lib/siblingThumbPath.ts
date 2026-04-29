/** e.g. `abc.jpg` → `abc_thumb.jpg` (same prefix path as main object). */
export function siblingThumbStorageKey(mainKey: string): string {
  const k = mainKey.trim().replace(/^\/+/, "");
  const lastDot = k.lastIndexOf(".");
  if (lastDot <= 0) return `${k}_thumb`;
  return `${k.slice(0, lastDot)}_thumb${k.slice(lastDot)}`;
}
