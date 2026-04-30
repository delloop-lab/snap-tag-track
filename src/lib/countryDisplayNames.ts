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
