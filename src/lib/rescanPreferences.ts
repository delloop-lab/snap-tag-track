export interface RescanPreferences {
  emptyOnly: boolean;
  previewDiff: boolean;
}

const DEFAULT_PREFS: RescanPreferences = {
  emptyOnly: false,
  previewDiff: false,
};

function keyForUser(userId?: string | null): string | null {
  if (!userId) return null;
  return `rescanPrefs:${userId}`;
}

export function getRescanPreferences(userId?: string | null): RescanPreferences {
  const key = keyForUser(userId);
  if (!key) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      emptyOnly: !!parsed.emptyOnly,
      previewDiff: !!parsed.previewDiff,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function getRescanPreferencesFromDb(
  supabase: any,
  userId?: string | null
): Promise<RescanPreferences> {
  if (!userId) return DEFAULT_PREFS;
  try {
    const { data, error } = await (supabase.from("users") as any)
      .select("rescan_empty_only,rescan_preview_diff")
      .eq("id", userId)
      .single();
    if (error || !data) return getRescanPreferences(userId);
    const prefs = {
      emptyOnly: !!data.rescan_empty_only,
      previewDiff: !!data.rescan_preview_diff,
    };
    setRescanPreferences(userId, prefs);
    return prefs;
  } catch {
    return getRescanPreferences(userId);
  }
}

export function setRescanPreferences(
  userId: string,
  prefs: RescanPreferences
): void {
  const key = keyForUser(userId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(prefs));
}

export type RescanPatchInput = {
  vendor_name: string | null;
  total_amount: number | null;
  purchase_date: string | null;
  text_content: string | null;
  line_items: unknown[] | null;
  currency: string | null;
};

export function buildRescanPatch(
  current: RescanPatchInput,
  extracted: any,
  emptyOnly: boolean
): Partial<RescanPatchInput> {
  const candidate: RescanPatchInput = {
    vendor_name: extracted.vendor ?? null,
    total_amount:
      typeof extracted.total_amount === "number" ? extracted.total_amount : null,
    purchase_date: extracted.purchase_date ?? null,
    text_content: extracted.raw_text ?? null,
    line_items:
      Array.isArray(extracted.line_items) && extracted.line_items.length > 0
        ? extracted.line_items
        : null,
    currency: extracted.currency ?? null,
  };

  const fields: (keyof RescanPatchInput)[] = [
    "vendor_name",
    "total_amount",
    "purchase_date",
    "text_content",
    "line_items",
    "currency",
  ];

  const patch: Partial<RescanPatchInput> = {};
  for (const field of fields) {
    const currentValue = current[field];
    const nextValue = candidate[field];
    if (nextValue === undefined) continue;

    if (emptyOnly) {
      const isEmpty =
        currentValue === null ||
        currentValue === "" ||
        (Array.isArray(currentValue) && currentValue.length === 0);
      if (isEmpty) {
        patch[field] = nextValue as any;
      }
    } else {
      patch[field] = nextValue as any;
    }
  }

  return patch;
}

export function patchDiffLines(
  current: RescanPatchInput,
  patch: Partial<RescanPatchInput>
): string[] {
  const labels: Record<keyof RescanPatchInput, string> = {
    vendor_name: "Vendor",
    total_amount: "Total",
    purchase_date: "Date",
    text_content: "Text",
    line_items: "Line items",
    currency: "Currency",
  };
  const lines: string[] = [];
  (Object.keys(patch) as (keyof RescanPatchInput)[]).forEach((field) => {
    const before = current[field];
    const after = patch[field];
    const beforeText = Array.isArray(before) ? `${before.length} items` : String(before);
    const afterText = Array.isArray(after) ? `${after.length} items` : String(after);
    if (beforeText !== afterText) {
      lines.push(`${labels[field]}: ${beforeText} -> ${afterText}`);
    }
  });
  return lines;
}
