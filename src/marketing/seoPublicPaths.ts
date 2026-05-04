/** Public SEO landing routes (pre-auth). Keep in sync with routes and sitemap. */
export const SEO_LANDING_PATHS = [
  "/receipt-scanner-app",
  "/warranty-tracker",
  "/expense-tracking-without-bank",
  "/contractor-expense-tracker",
  "/household-spending-tracker",
  "/fuel-food-spending-tracker",
  "/how-it-works",
  "/pricing",
  "/use-cases",
  "/blog",
] as const;

export type SeoLandingPath = (typeof SEO_LANDING_PATHS)[number];

export const SEO_LANDING_PATH_SET = new Set<string>(SEO_LANDING_PATHS);

export function isSeoLandingPath(pathname: string): boolean {
  return SEO_LANDING_PATH_SET.has(pathname);
}
