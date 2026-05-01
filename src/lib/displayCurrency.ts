/** When receipts.currency is null, UI falls back to the user Profile preference (default GBP). */
export const FALLBACK_DISPLAY_CURRENCY = "GBP";

/** Common ISO 4217 options for Profile; must be valid for Intl. */
export const DISPLAY_CURRENCY_OPTIONS: { code: string; label: string }[] = [
  { code: "GBP", label: "GBP · British pound" },
  { code: "USD", label: "USD · US dollar" },
  { code: "EUR", label: "EUR · Euro" },
  { code: "AUD", label: "AUD · Australian dollar" },
  { code: "CAD", label: "CAD · Canadian dollar" },
  { code: "NZD", label: "NZD · New Zealand dollar" },
  { code: "CHF", label: "CHF · Swiss franc" },
  { code: "JPY", label: "JPY · Japanese yen" },
  { code: "INR", label: "INR · Indian rupee" },
  { code: "CNY", label: "CNY · Chinese yuan" },
  { code: "SEK", label: "SEK · Swedish krona" },
  { code: "NOK", label: "NOK · Norwegian krone" },
  { code: "DKK", label: "DKK · Danish krone" },
  { code: "PLN", label: "PLN · Polish złoty" },
  { code: "CZK", label: "CZK · Czech koruna" },
  { code: "SGD", label: "SGD · Singapore dollar" },
  { code: "HKD", label: "HKD · Hong Kong dollar" },
  { code: "MXN", label: "MXN · Mexican peso" },
  { code: "BRL", label: "BRL · Brazilian real" },
];

export function sanitizeDisplayCurrency(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const c = code.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : null;
}

/** Format monetary amount using receipt ISO code when set, otherwise profile fallback (for display only). */
export function formatReceiptCurrency(
  amount: number | null,
  receiptCurrencyIso: string | null | undefined,
  profileFallbackIso: string,
  options?: {
    /** When amount is null (default "N/A" for lists, "Not available" for detail). */
    nullLabel?: string;
    locale?: string;
  },
): string {
  const nullLabel = options?.nullLabel ?? "N/A";
  if (amount === null || Number.isNaN(amount)) return nullLabel;

  const fromReceipt = sanitizeDisplayCurrency(receiptCurrencyIso ?? null);
  const fallback = sanitizeDisplayCurrency(profileFallbackIso) ?? FALLBACK_DISPLAY_CURRENCY;
  const code = fromReceipt ?? fallback;
  const locale = options?.locale ?? "en-GB";

  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}
