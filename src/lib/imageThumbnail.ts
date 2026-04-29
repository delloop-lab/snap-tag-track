/**
 * List/grid preview — small JPEG next to full upload (`*_thumb.jpg`), same semantics as ReceiptUpload.
 *
 * Uses a temporary `blob:` URL while decoding. DevTools may list those as jpeg with "0.0 kB" —
 * that is normal (in-memory, not a network download). Real receipt loads use Supabase signed HTTPS URLs.
 */
export async function createThumbnailJpeg(
  blob: Blob,
  maxPx = 384,
  quality = 0.72
): Promise<Blob | null> {
  if (!blob || blob.size === 0) return null;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxPx / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      canvas.toBlob(
        (out) => {
          URL.revokeObjectURL(url);
          if (!out || out.size === 0) {
            resolve(null);
            return;
          }
          resolve(out);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}
