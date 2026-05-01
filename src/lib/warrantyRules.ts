/** Error message when warranty is on but purchase date is missing. */
export const WARRANTY_REQUIRES_PURCHASE_DATE =
  "Warranty needs a purchase date. Add the purchase date before turning on warranty.";

export function purchaseDateStringIsPresent(value: string | null | undefined): boolean {
  return Boolean(value && String(value).trim() !== "");
}

/** Returns an error message if invalid, or null if OK. */
export function validateWarrantyWithPurchaseDate(warranty: boolean, purchaseDateIso: string | null | undefined): string | null {
  if (!warranty) return null;
  if (!purchaseDateStringIsPresent(purchaseDateIso ?? null)) return WARRANTY_REQUIRES_PURCHASE_DATE;
  return null;
}
