/** Blog → crawlable guide links (conversion). Kept separate from editorial `relatedSlugs`. */
export const SEO_GUIDE_LINK_LABELS: Record<string, string> = {
  "/receipt-scanner-app": "Receipt scanner app",
  "/how-it-works": "How Snap Tag Track works",
  "/use-cases": "Use cases",
  "/warranty-tracker": "Warranty tracker",
  "/returns-cooling-off": "Returns & cooling-off",
  "/expense-tracking-without-bank": "Expense tracking without a bank",
  "/contractor-expense-tracker": "Contractor expense tracker",
  "/household-spending-tracker": "Household spending tracker",
  "/fuel-food-spending-tracker": "Fuel & food spending tracker",
  "/pricing": "Pricing",
};

const DEFAULT_GUIDE_PATHS = ["/how-it-works", "/use-cases", "/receipt-scanner-app"];

const GUIDES_BY_SLUG: Partial<Record<string, string[]>> = {
  "how-to-track-receipts-for-taxes": [
    "/receipt-scanner-app",
    "/expense-tracking-without-bank",
    "/contractor-expense-tracker",
  ],
  "how-to-claim-warranty-without-receipt": ["/warranty-tracker", "/receipt-scanner-app"],
  "how-to-track-expenses-without-bank": ["/expense-tracking-without-bank", "/receipt-scanner-app"],
  "contractor-expense-tracking-explained": ["/contractor-expense-tracker", "/expense-tracking-without-bank"],
  "how-to-track-household-spending": ["/household-spending-tracker", "/expense-tracking-without-bank"],
  "best-way-to-track-fuel-and-food-spending": ["/fuel-food-spending-tracker", "/household-spending-tracker"],
  "what-is-receipt-tracking-app": ["/receipt-scanner-app", "/how-it-works"],
  "how-receipt-tracking-works": ["/how-it-works", "/receipt-scanner-app"],
  "why-expense-tracking-fails": ["/expense-tracking-without-bank", "/use-cases"],
  "household-vs-contractor-expense-tracking": [
    "/household-spending-tracker",
    "/contractor-expense-tracker",
    "/use-cases",
  ],
};

export function seoGuideLinksForBlogSlug(slug: string): { path: string; label: string }[] {
  const paths = GUIDES_BY_SLUG[slug] ?? DEFAULT_GUIDE_PATHS;
  return paths.map((path) => ({
    path,
    label: SEO_GUIDE_LINK_LABELS[path] ?? path,
  }));
}
