/** When receipts.currency is null, UI falls back to the user Profile preference (default GBP). */
export const FALLBACK_DISPLAY_CURRENCY = "GBP";

type SupportedValuesIntl = Intl & {
  supportedValuesOf?: (key: "currency") => string[];
};

function buildDisplayCurrencyOptions(): { code: string; label: string }[] {
  const intlWithSupported = Intl as SupportedValuesIntl;
  const supported = intlWithSupported.supportedValuesOf?.("currency") ?? [];
  const codes = new Set(supported.map((c) => c.toUpperCase()));
  codes.add(FALLBACK_DISPLAY_CURRENCY);

  const currencyNames = new Intl.DisplayNames("en", { type: "currency" });
  const options = [...codes]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, label: code }));

  const fallbackIdx = options.findIndex((o) => o.code === FALLBACK_DISPLAY_CURRENCY);
  if (fallbackIdx > 0) {
    const [fallback] = options.splice(fallbackIdx, 1);
    options.unshift(fallback);
  }

  return options;
}

/** Exhaustive ISO 4217 options from Intl support (fallback currency pinned first). */
export const DISPLAY_CURRENCY_OPTIONS: { code: string; label: string }[] =
  buildDisplayCurrencyOptions();

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
