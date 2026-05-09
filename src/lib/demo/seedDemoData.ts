import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_RECEIPTS_DATASET,
  ocrTextForReceipt,
  totalForReceipt,
} from "@/lib/demo/demoDataset";

const DEMO_TYPE = "demo";
const DEMO_NOTES_PREFIX = "[DEMO]";
function demoTagNames(category: string): string[] {
  // Dashboard "Spend by Tag" should show high-level category buckets only.
  return category ? [category.toLowerCase()] : [];
}

function toIsoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function demoNotes(seed: (typeof DEMO_RECEIPTS_DATASET)[number]): string | null {
  if (!seed.warrantyEligible) return null;
  const items = seed.lineItems.map((i) => i.name).join(", ");
  return `Items: ${items}`;
}

async function ensureDemoTagsLinked(userId: string): Promise<void> {
  const { data: demoReceipts, error: demoReceiptsError } = await supabase
    .from("receipts")
    .select("id,vendor_name")
    .eq("user_id", userId)
    .eq("type", DEMO_TYPE);
  if (demoReceiptsError) throw demoReceiptsError;
  if (!demoReceipts || demoReceipts.length === 0) return;

  const categoryByReceiptId = new Map<string, string>();
  for (const receipt of demoReceipts) {
    const vendor = (receipt.vendor_name || "").trim();
    const fromDataset = DEMO_RECEIPTS_DATASET.find((r) => r.vendor === vendor);
    const category = fromDataset?.category.toLowerCase() || "";
    if (category) categoryByReceiptId.set(receipt.id, category);
  }

  const tagsNeeded = Array.from(new Set(Array.from(categoryByReceiptId.values())));
  if (tagsNeeded.length === 0) return;

  const { data: existingTags, error: existingTagsError } = await supabase
    .from("tags")
    .select("id,name")
    .eq("user_id", userId)
    .in("name", tagsNeeded);
  if (existingTagsError) throw existingTagsError;

  const existingByName = new Map((existingTags || []).map((t) => [t.name, t.id]));
  const missingTagNames = tagsNeeded.filter((name) => !existingByName.has(name));

  if (missingTagNames.length > 0) {
    const { error: insertTagsError } = await supabase
      .from("tags")
      .insert(missingTagNames.map((name) => ({ user_id: userId, name })));
    if (insertTagsError) throw insertTagsError;
  }

  const { data: allTags, error: allTagsError } = await supabase
    .from("tags")
    .select("id,name")
    .eq("user_id", userId)
    .in("name", tagsNeeded);
  if (allTagsError) throw allTagsError;
  const tagIdByName = new Map((allTags || []).map((t) => [t.name, t.id]));

  const receiptIds = (demoReceipts || []).map((r) => r.id);

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("receipt_tags")
    .select("receipt_id,tag_id")
    .in("receipt_id", receiptIds);
  if (existingLinksError) throw existingLinksError;
  const existingLinkKeys = new Set(
    (existingLinks || []).map((row) => `${row.receipt_id}:${row.tag_id}`)
  );

  const linksToInsert: { receipt_id: string; tag_id: string }[] = [];
  for (const [receiptId, category] of categoryByReceiptId.entries()) {
    const tagId = tagIdByName.get(category);
    if (!tagId) continue;
    const key = `${receiptId}:${tagId}`;
    if (existingLinkKeys.has(key)) continue;
    existingLinkKeys.add(key);
    linksToInsert.push({ receipt_id: receiptId, tag_id: tagId });
  }

  if (linksToInsert.length > 0) {
    const { error: linkInsertError } = await supabase.from("receipt_tags").insert(linksToInsert);
    if (linkInsertError) throw linkInsertError;
  }
}

export async function seedDemoData(userId: string): Promise<void> {
  if (!userId) return;

  const { data: existingDemoRows, error: existingDemoRowsError } = await supabase
    .from("receipts")
    .select(
      "user_id,vendor_name,purchase_date,total_amount,notes,type,image_path,product_image_path,warranty,warranty_expires_at,text_content"
    )
    .eq("user_id", userId)
    .eq("type", DEMO_TYPE)
    .limit(200);
  if (existingDemoRowsError) throw existingDemoRowsError;

  const today = new Date();
  const payload = DEMO_RECEIPTS_DATASET.map((seed) => {
    // Keep warranty-eligible demo receipts recent so Easy Returns reflects actionable items.
    const useRecentDate = seed.warrantyEligible;
    const purchaseDate = useRecentDate
      ? shiftDays(
          today,
          seed.vendor === "Worten" ? -2 : seed.vendor === "IKEA" ? -5 : seed.vendor === "Zara" ? -8 : -3
        )
      : seed.purchaseDate;
    const warrantyEnd = seed.warrantyEligible
      ? seed.warrantyExpiryDate
      : null;
    return {
      user_id: userId,
      vendor_name: seed.vendor,
      purchase_date: purchaseDate,
      total_amount: totalForReceipt(seed),
      notes: demoNotes(seed),
      type: DEMO_TYPE,
      image_path: seed.imagePath,
      product_image_path: seed.productImage,
      warranty: seed.warrantyEligible,
      warranty_expires_at: warrantyEnd,
      text_content: ocrTextForReceipt(seed),
      line_items: seed.lineItems.map((item) => ({
        description: item.name,
        amount: Number((item.qty * item.unitPrice).toFixed(2)),
      })),
    };
  });

  // Demo-only reset so the shown set always matches currently provided vendor images.
  const { error: clearExistingError } = await supabase
    .from("receipts")
    .delete()
    .eq("user_id", userId)
    .eq("type", DEMO_TYPE);
  if (clearExistingError) throw clearExistingError;

  const { error: insertError } = await supabase.from("receipts").insert(payload);
  if (insertError) {
    // Fail-safe: restore previous demo set so users are never left empty.
    if ((existingDemoRows || []).length > 0) {
      await supabase.from("receipts").insert(existingDemoRows);
    }
    throw insertError;
  }
  try {
    await ensureDemoTagsLinked(userId);
  } catch (tagError) {
    // Keep seeded receipts visible even if tag linking fails.
    console.warn("[demo] seeded receipts but failed to link tags", tagError);
  }
}

export async function clearDemoData(userId: string): Promise<void> {
  if (!userId) return;
  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("user_id", userId)
    .eq("type", DEMO_TYPE);
  if (error) throw error;
}

export function isDemoReceiptRecord(value: { type?: string | null; notes?: string | null }): boolean {
  return value.type === DEMO_TYPE || (value.notes || "").includes(`${DEMO_NOTES_PREFIX} is_demo=true`);
}
