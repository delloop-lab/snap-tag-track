import { supabase } from "@/integrations/supabase/client";
import { createThumbnailJpeg } from "@/lib/imageThumbnail";
import {
  candidateStoragePathsForKey,
  primaryReceiptObjectKey,
  receiptThumbnailSiblingExists,
  resolveReceiptImageUrl,
} from "@/lib/receiptImageUrl";
import { siblingThumbStorageKey } from "@/lib/siblingThumbPath";

export type BackfillReceiptThumbnailsProgress = {
  done: number;
  total: number;
  receiptId?: string;
  stage: "fetch" | "compress" | "upload" | "skip";
};

export type BackfillReceiptThumbnailsResult = {
  created: number;
  skipped: number;
  failed: number;
};

/**
 * Downloads each receipt image, builds a *_thumb JPEG next to it in storage (same as new uploads).
 * Skips rows that already have a sibling thumb object.
 */
export async function backfillMissingReceiptThumbnails(options: {
  userId: string;
  concurrency?: number;
  onProgress?: (p: BackfillReceiptThumbnailsProgress) => void;
}): Promise<BackfillReceiptThumbnailsResult> {
  const { userId, concurrency = 2, onProgress } = options;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  const { data: rows, error: selErr } = await supabase
    .from("receipts")
    .select("id, image_path")
    .eq("user_id", userId);

  if (selErr || !rows) {
    console.error("[backfillReceiptThumbnails]", selErr);
    return { created: 0, skipped: 0, failed: 0 };
  }

  type Row = { id: string; image_path: string | null };
  const usable = rows.filter((r): r is Row & { image_path: string } => Boolean(r.image_path?.trim()));
  const total = usable.length;
  onProgress?.({ done: 0, total, stage: "skip" });
  let done = 0;

  const processOne = async (row: Row & { image_path: string }) => {
    const report = (stage: BackfillReceiptThumbnailsProgress["stage"]) => {
      onProgress?.({ done, total, receiptId: row.id, stage });
    };

    try {
      const primaryKey = primaryReceiptObjectKey(row.image_path);
      if (!primaryKey) {
        failed++;
        return;
      }

      if (await receiptThumbnailSiblingExists(row.image_path)) {
        skipped++;
        report("skip");
        return;
      }

      report("fetch");
      const imageUrl = await resolveReceiptImageUrl(row.image_path, 60 * 60);
      if (!imageUrl) {
        failed++;
        return;
      }

      const resp = await fetch(imageUrl);
      if (!resp.ok) {
        failed++;
        return;
      }

      const mainBlob = await resp.blob();
      if (mainBlob.size === 0) {
        failed++;
        return;
      }
      report("compress");
      const thumbBlob = await createThumbnailJpeg(mainBlob);
      if (!thumbBlob || thumbBlob.size === 0) {
        failed++;
        return;
      }

      const thumbBase = siblingThumbStorageKey(primaryKey);
      const uploadCandidates = candidateStoragePathsForKey(thumbBase);
      report("upload");
      let uploaded = false;
      for (const key of uploadCandidates) {
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(key, thumbBlob, { contentType: "image/jpeg", upsert: true });
        if (!upErr) {
          uploaded = true;
          break;
        }
      }
      if (uploaded) created++;
      else failed++;
    } catch (e) {
      console.warn("[backfillReceiptThumbnails] row", row.id, e);
      failed++;
    } finally {
      done++;
      onProgress?.({ done, total, receiptId: row.id, stage: "skip" });
    }
  };

  const queue = [...usable];
  const workers = Array.from({ length: Math.min(concurrency, Math.max(queue.length, 1)) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (next) await processOne(next as Row & { image_path: string });
    }
  });
  await Promise.all(workers);

  return { created, skipped, failed };
}
