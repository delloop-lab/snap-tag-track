/** English region display names (CLDR via Intl), sorted A–Z. Built once at module load. */
function buildCountryDisplayNames(): string[] {
  const dn = new Intl.DisplayNames("en", { type: "region" });
  const names = new Set<string>();
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j);
      const label = dn.of(code);
      if (!label || label === code) continue;
      if (/^[A-Z]{2}$/.test(label)) continue;
      names.add(label);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export const COUNTRY_DISPLAY_NAMES_EN: readonly string[] = buildCountryDisplayNames();

function buildCountryCodeByDisplayName(): Readonly<Record<string, string>> {
  const dn = new Intl.DisplayNames("en", { type: "region" });
  const out: Record<string, string> = {};
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j);
      const label = dn.of(code);
      if (!label || label === code) continue;
      if (/^[A-Z]{2}$/.test(label)) continue;
      out[label] = code;
    }
  }
  return out;
}

/** Maps an English country display name (e.g. "United Kingdom") to ISO country code (e.g. "GB"). */
export const COUNTRY_CODE_BY_DISPLAY_NAME_EN: Readonly<Record<string, string>> =
  buildCountryCodeByDisplayName();
