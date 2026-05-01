import { addDays, addMonths, differenceInCalendarDays, format, isValid, parseISO, startOfDay, subMonths } from "date-fns";

export const FALLBACK_WARRANTY_MONTHS = 36;
export const FALLBACK_RETURN_WINDOW_DAYS = 30;

export const SNAP_USER_SHOPPING_PREFS_EVENT = "snap:user-shopping-prefs-changed";

export function notifyUserShoppingPrefsChanged(): void {
  window.dispatchEvent(new CustomEvent(SNAP_USER_SHOPPING_PREFS_EVENT));
}

/** Parse YYYY-MM-DD as local calendar date (no UTC drift); invalid segments yield an invalid Date. */
export function parseLocalDateYmd(ymd: string): Date {
  const parts = ymd.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return new Date(Number.NaN);
  const [y, m, d] = parts;
  return startOfDay(new Date(y, m - 1, d));
}

/**
 * Effective warranty end: saved end date on receipt, else purchase + default months.
 */
export function warrantyEndFromReceipt(
  purchaseDateIso: string | null | undefined,
  warrantyExpiresAtYmd: string | null | undefined,
  defaultWarrantyMonths: number,
): Date | null {
  if (warrantyExpiresAtYmd?.trim()) {
    const end = parseLocalDateYmd(warrantyExpiresAtYmd.trim());
    return isValid(end) ? end : null;
  }
  if (!purchaseDateIso?.trim()) return null;
  try {
    const purchase = parseISO(purchaseDateIso);
    if (!isValid(purchase)) return null;
    return startOfDay(addMonths(purchase, defaultWarrantyMonths));
  } catch {
    return null;
  }
}

/** Start of progress timeline toward `end` when purchase date is missing. */
export function warrantyWindowStartForProgress(
  purchaseDateIso: string | null | undefined,
  end: Date,
  defaultWarrantyMonths: number,
): Date {
  try {
    if (purchaseDateIso?.trim()) {
      const p = parseISO(purchaseDateIso);
      if (isValid(p)) return startOfDay(p);
    }
  } catch {
    // fall through
  }
  return startOfDay(subMonths(end, defaultWarrantyMonths));
}

export function describeWarrantyMonths(months: number): string {
  const m = Number.isFinite(months) ? Math.round(months) : FALLBACK_WARRANTY_MONTHS;
  if (m % 12 === 0 && m >= 12) {
    const y = m / 12;
    return `${y} year${y === 1 ? "" : "s"}`;
  }
  return `${m} month${m === 1 ? "" : "s"}`;
}

export function suggestedReturnDeadline(
  purchaseDateIso: string | null | undefined,
  returnWindowDays: number,
): Date | null {
  if (!purchaseDateIso?.trim() || returnWindowDays <= 0) return null;
  try {
    const purchase = parseISO(purchaseDateIso);
    if (!isValid(purchase)) return null;
    return startOfDay(addDays(purchase, returnWindowDays));
  } catch {
    return null;
  }
}

export type ReturnWindowReceipt = {
  id: string;
  productLabel: string;
  purchaseDateIso: string;
  deadline: Date;
  calendarDaysRemaining: number;
};

/**
 * Receipts with purchase date today or earlier and still inside the user's return window (today ≤ deadline).
 * Sorted soonest deadline first.
 */
export function receiptsEligibleForEasyReturn<
  R extends { id: string; vendor_name: string | null; purchase_date: string | null },
>(rows: R[], today: Date, returnWindowDays: number): ReturnWindowReceipt[] {
  if (returnWindowDays <= 0 || rows.length === 0) return [];
  const day = startOfDay(today);
  const out: ReturnWindowReceipt[] = [];
  for (const r of rows) {
    const p = r.purchase_date?.trim();
    if (!p) continue;
    const purchase = parseISO(p);
    if (!isValid(purchase)) continue;
    const purchaseDay = startOfDay(purchase);
    if (differenceInCalendarDays(day, purchaseDay) < 0) continue;
    const deadline = suggestedReturnDeadline(p, returnWindowDays);
    if (!deadline) continue;
    const calendarDaysRemaining = differenceInCalendarDays(deadline, day);
    if (calendarDaysRemaining < 0) continue;
    const productLabel = r.vendor_name?.trim() || `Receipt ${format(purchaseDay, "MMM d")}`;
    out.push({ id: r.id, productLabel, purchaseDateIso: p, deadline, calendarDaysRemaining });
  }
  out.sort(
    (a, b) =>
      a.calendarDaysRemaining - b.calendarDaysRemaining ||
      a.deadline.getTime() - b.deadline.getTime(),
  );
  return out;
}

/** Receipts counted as eligible for denominator (purchase date exists, not future). */
export function receiptsWithTrackedPurchaseDates<
  R extends { purchase_date: string | null },
>(rows: R[], today: Date): number {
  const day = startOfDay(today);
  let n = 0;
  for (const r of rows) {
    const p = r.purchase_date?.trim();
    if (!p) continue;
    const purchase = parseISO(p);
    if (!isValid(purchase)) continue;
    if (differenceInCalendarDays(day, startOfDay(purchase)) < 0) continue;
    n++;
  }
  return n;
}
