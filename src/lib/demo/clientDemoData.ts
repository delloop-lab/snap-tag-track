import {
  DEMO_RECEIPTS_DATASET,
  ocrTextForReceipt,
  totalForReceipt,
  round2,
  type DemoReceiptRecord,
} from "@/lib/demo/demoDataset";

/** Synthetic `user_id` for client-only demo rows (no Supabase user). */
export const CLIENT_DEMO_USER_ID = "__demo_client__";

export function isClientDemoReceiptId(id: string): boolean {
  return DEMO_RECEIPTS_DATASET.some((r) => r.id === id);
}

/** Random id from the seeded demo dataset (session preview simulated snap only). */
export function pickRandomDemoReceiptId(): string {
  const list = DEMO_RECEIPTS_DATASET;
  if (list.length === 0) {
    throw new Error("pickRandomDemoReceiptId: empty demo dataset");
  }
  return list[Math.floor(Math.random() * list.length)]!.id;
}

/** Storage/public image path for a seeded demo receipt (for preview UI). */
export function getClientDemoReceiptImagePath(receiptId: string): string | null {
  const seed = DEMO_RECEIPTS_DATASET.find((r) => r.id === receiptId);
  return seed?.imagePath ?? null;
}

/** True when URL is `/receipt/:id` for a known session-demo receipt id. */
export function pathnameIsClientDemoReceipt(pathname: string): boolean {
  if (!pathname.startsWith("/receipt/")) return false;
  const id = pathname.slice("/receipt/".length).split("/")[0] ?? "";
  return isClientDemoReceiptId(id);
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

/** Match seedDemoData date shifting so charts and warranties look current. */
export function shiftedPurchaseDateIso(seed: DemoReceiptRecord, today = new Date()): string {
  if (!seed.warrantyEligible) return seed.purchaseDate;
  const offset =
    seed.vendor === "Worten" ? -2 : seed.vendor === "IKEA" ? -5 : seed.vendor === "Zara" ? -8 : -3;
  return shiftDays(today, offset);
}

export type ClientDemoWarrantyRow = {
  id: string;
  vendor_name: string | null;
  purchase_date: string | null;
  warranty: boolean;
  warranty_expires_at: string | null;
  type: string | null;
  notes: string | null;
};

function demoNotes(seed: DemoReceiptRecord): string | null {
  if (!seed.warrantyEligible) return null;
  const items = seed.lineItems.map((i) => i.name).join(", ");
  return `Items: ${items}`;
}

export function buildClientDemoWarrantyRows(today = new Date()): ClientDemoWarrantyRow[] {
  return DEMO_RECEIPTS_DATASET.filter((r) => r.warrantyEligible).map((seed) => ({
    id: seed.id,
    vendor_name: seed.vendor,
    purchase_date: shiftedPurchaseDateIso(seed, today),
    warranty: true,
    warranty_expires_at: seed.warrantyExpiryDate,
    type: "demo",
    notes: demoNotes(seed),
  }));
}

export function buildClientDemoChartReceipts(today = new Date()) {
  const withShifted = DEMO_RECEIPTS_DATASET.map((r) => ({
    seed: r,
    purchase: shiftedPurchaseDateIso(r, today),
  }));
  withShifted.sort((a, b) => {
    const ta = `${a.purchase}T${a.seed.purchaseTime}`;
    const tb = `${b.purchase}T${b.seed.purchaseTime}`;
    return tb.localeCompare(ta);
  });
  return withShifted.map(({ seed, purchase }) => ({
    purchase_date: purchase,
    total_amount: totalForReceipt(seed),
    receipt_tags: seed.tags.map((tag) => ({ tags: { name: tag } })),
  }));
}

export function buildClientDemoRecentReceipts(isMobile: boolean, today = new Date()) {
  const rows = DEMO_RECEIPTS_DATASET.map((r) => ({
    seed: r,
    purchase: shiftedPurchaseDateIso(r, today),
  }));
  rows.sort((a, b) => {
    const ta = `${a.purchase}T${a.seed.purchaseTime}`;
    const tb = `${b.purchase}T${b.seed.purchaseTime}`;
    return tb.localeCompare(ta);
  });
  return rows.slice(0, isMobile ? 3 : 6).map(({ seed: r }) => ({
    id: r.id,
    vendor_name: r.vendor,
    total_amount: totalForReceipt(r),
    purchase_date: shiftedPurchaseDateIso(r, today),
    image_path: r.imagePath,
    type: "demo",
    notes: null,
  }));
}

/** All demo receipts for `ReceiptList` in session preview (same shape as Supabase list rows). */
export function buildClientDemoReceiptListForUI(today = new Date()) {
  const rows = DEMO_RECEIPTS_DATASET.map((seed) => {
    const purchase = shiftedPurchaseDateIso(seed, today);
    const createdIso = `${purchase}T${seed.purchaseTime}:00`;
    const tags = seed.tags.map((name, i) => ({ id: `${seed.id}-tag-${i}`, name }));
    return {
      id: seed.id,
      user_id: CLIENT_DEMO_USER_ID,
      image_path: seed.imagePath,
      text_content: ocrTextForReceipt(seed),
      vendor_name: seed.vendor,
      total_amount: totalForReceipt(seed),
      purchase_date: purchase,
      currency: seed.currency,
      created_at: createdIso,
      updated_at: createdIso,
      tags,
    };
  });
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rows;
}

/** Full receipt row for `ReceiptDetail` when browsing session demo (no DB). */
export function buildClientDemoReceiptDetail(id: string, today = new Date()) {
  const seed = DEMO_RECEIPTS_DATASET.find((r) => r.id === id);
  if (!seed) return null;

  const purchase = shiftedPurchaseDateIso(seed, today);
  const createdIso = `${purchase}T${seed.purchaseTime}:00`;
  const lineItems = seed.lineItems.map((item) => ({
    description: `${item.qty}× ${item.name}`,
    amount: round2(item.qty * item.unitPrice * (1 + item.vatRate / 100)),
  }));
  const receiptTags = seed.tags.map((name, i) => {
    const tid = `${seed.id}-tag-${i}`;
    return { tag_id: tid, tags: { id: tid, name } };
  });

  return {
    id: seed.id,
    user_id: CLIENT_DEMO_USER_ID,
    image_path: seed.imagePath,
    product_image_path: seed.productImage,
    text_content: ocrTextForReceipt(seed),
    vendor_name: seed.vendor,
    total_amount: totalForReceipt(seed),
    purchase_date: purchase,
    created_at: createdIso,
    updated_at: createdIso,
    notes: demoNotes(seed),
    warranty: seed.warrantyEligible,
    warranty_expires_at: seed.warrantyExpiryDate,
    receipt_tags: receiptTags,
    client_name: null as string | null,
    type: "demo" as string | null,
    latitude: null as number | null,
    longitude: null as number | null,
    location_name: null as string | null,
    line_items: lineItems,
    currency: seed.currency,
  };
}

/** Receipt rows for Summary page in session demo (matches `ReceiptSummaryList` shape). */
export function buildClientDemoSummaryReceipts(today = new Date()) {
  const rows = DEMO_RECEIPTS_DATASET.map((seed) => {
    const purchase = shiftedPurchaseDateIso(seed, today);
    const createdIso = `${purchase}T${seed.purchaseTime}:00`;
    const receiptTags = seed.tags.map((name, i) => {
      const tid = `${seed.id}-tag-${i}`;
      return { tag_id: tid, tags: { id: tid, name } };
    });
    const lineItems = seed.lineItems.map((item) => ({
      description: `${item.qty}× ${item.name}`,
      amount: round2(item.qty * item.unitPrice * (1 + item.vatRate / 100)),
    }));
    return {
      id: seed.id,
      receipt_tags: receiptTags,
      vendor_name: seed.vendor,
      purchase_date: purchase,
      total_amount: totalForReceipt(seed),
      type: "demo" as string | null,
      client_name: null as string | null,
      notes: demoNotes(seed),
      warranty: seed.warrantyEligible,
      warranty_expires_at: seed.warrantyExpiryDate,
      image_path: seed.imagePath,
      product_image_path: seed.productImage,
      text_content: ocrTextForReceipt(seed),
      line_items: lineItems,
      currency: seed.currency,
      created_at: createdIso,
      updated_at: createdIso,
    };
  });
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rows;
}

export function buildClientDemoSummaryTags(): { id: string; name: string }[] {
  const seen = new Set<string>();
  const out: { id: string; name: string }[] = [];
  for (const r of DEMO_RECEIPTS_DATASET) {
    for (const name of r.tags) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: `demo-tag-${key}`, name });
    }
  }
  return out;
}

export function buildClientDemoStats(today = new Date()) {
  const rows = DEMO_RECEIPTS_DATASET.map((r) => ({
    purchase: shiftedPurchaseDateIso(r, today),
    total: totalForReceipt(r),
    tags: r.tags,
  }));
  const year = today.getFullYear();
  const monthPrefix = `${year}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const totalThisYear = rows.filter((r) => r.purchase.startsWith(`${year}-`)).length;
  const spendThisMonth = rows
    .filter((r) => r.purchase.startsWith(monthPrefix))
    .reduce((sum, r) => sum + r.total, 0);
  const untaggedCount = DEMO_RECEIPTS_DATASET.filter((r) => r.tags.length === 0).length;
  return {
    totalThisYear,
    spendThisMonth,
    totalReceiptsCount: DEMO_RECEIPTS_DATASET.length,
    totalWarrantyCount: DEMO_RECEIPTS_DATASET.filter((r) => r.warrantyEligible).length,
    untaggedCount,
  };
}
