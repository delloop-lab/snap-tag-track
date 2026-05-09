import { CANONICAL_ORIGIN } from "./site";

export type RouteSeo = {
  title: string;
  description: string;
  /** Set for app/private surfaces or Help (support hub): keep out of search while allowing crawl. */
  robots?: "noindex, nofollow" | "noindex, follow";
};

const PUBLIC_ROUTES: Record<string, RouteSeo> = {
  "/": {
    title: "Snap Tag Track | Receipt & Warranty App",
    description:
      "Receipt tracking, warranty reminders, and expense tracking from photos—no bank link. Snap receipts, tag spending, get expiry alerts.",
  },
  "/help": {
    title: "Help & support | Snap Tag Track",
    description:
      "In-product help only: uploads, scanning steps, summaries, troubleshooting, and account FAQs. Editorial and discovery content lives on Blog and crawlable guides.",
    robots: "noindex, follow",
  },
  "/contact": {
    title: "Contact Snap Tag Track | Support",
    description:
      "Reach the Snap Tag Track team for receipt tracking, warranty reminders, billing, or product feedback. We read every message.",
  },
  "/privacy": {
    title: "Privacy Policy | Snap Tag Track",
    description:
      "How Snap Tag Track handles your data for receipt tracking and expense tracking. Plain-language privacy for photos, tags, and account info.",
  },
  "/terms": {
    title: "Terms of Service | Snap Tag Track",
    description:
      "Terms covering use of Snap Tag Track, receipt tracking features, warranties, uploads, accounts, and acceptable use.",
  },
  "/auth": {
    title: "Sign in | Snap Tag Track",
    description:
      "Create an account or sign in to start receipt tracking, expense tagging, and warranty reminders in your browser.",
  },
  "/receipt-scanner-app": {
    title: "Receipt Scanner App | Snap Tag Track",
    description:
      "Browser receipt scanner: snap receipts, tag spending, and keep warranty-ready proof without linking your bank account.",
  },
  "/warranty-tracker": {
    title: "Warranty Tracker & Reminders | Snap Tag Track",
    description:
      "Track warranties from receipts, store proof of purchase, and get reminders before coverage expires—built for homes and contractors.",
  },
  "/returns-cooling-off": {
    title: "Returns & Cooling-Off | Receipt Proof | Snap Tag Track",
    description:
      "Keep dated receipt proof and reminders for return windows and cooling-off—separate from manufacturer warranty tracking. Not legal advice.",
  },
  "/expense-tracking-without-bank": {
    title: "Expense Tracking Without Bank | Snap Tag Track",
    description:
      "Expense tracking from receipts and tags—no bank connection. Capture what matters, organise by vendor and category, stay private.",
  },
  "/contractor-expense-tracker": {
    title: "Contractor Expense Tracker | Snap Tag Track",
    description:
      "Tag job receipts, keep materials proof organised, and separate work spend from personal—receipt-first expense tracking for contractors.",
  },
  "/household-spending-tracker": {
    title: "Household Spending Tracker | Snap Tag Track",
    description:
      "Household spending clarity from real receipts: groceries, fuel, kids, and repairs—shared visibility without bank feed noise.",
  },
  "/fuel-food-spending-tracker": {
    title: "Fuel & Food Spending Tracker | Snap Tag Track",
    description:
      "Track fuel and grocery spend from receipts you snap—see trends by tag and month, including cash purchases bank apps miss.",
  },
  "/how-it-works": {
    title: "How Snap Tag Track Works | Receipt App",
    description:
      "How it works: snap receipts, tag purchases, review summaries, and warranty reminders—all in your browser without mandatory bank linking.",
  },
  "/pricing": {
    title: "Pricing | Snap Tag Track Receipt App",
    description:
      "Snap Tag Track pricing and free tier limits for receipt scans—simple entry so you can try receipt and warranty tracking risk-free.",
  },
  "/use-cases": {
    title: "Use Cases | Snap Tag Track",
    description:
      "Use cases for receipt scanning, warranty tracking, contractor job proof, and household expense visibility—pick a workflow to start.",
  },
  "/blog": {
    title: "Blog | Snap Tag Track",
    description:
      "Articles on receipt habits, warranties, and spending—editorial posts separate from Help Centre support and crawlable topic pages.",
  },
  "/blog/how-to-track-receipts-for-taxes": {
    title: "Track Receipts for Taxes (No Chaos)",
    description:
      "How to track receipts for taxes with instant capture, digital storage, tags, and searchable records.",
  },
  "/blog/how-to-claim-warranty-without-receipt": {
    title: "Claim Warranty Without Paper Receipt",
    description:
      "How to claim warranty without a paper receipt using digital photos, purchase dates, and expiry reminders.",
  },
  "/blog/how-to-track-expenses-without-bank": {
    title: "Track Expenses Without Bank Sync",
    description:
      "Track expenses without connecting your bank: capture receipts, tag categories, and review private totals.",
  },
  "/blog/contractor-expense-tracking-explained": {
    title: "Contractor Expense Tracking Explained",
    description:
      "How contractors track job costs, materials, fuel, and labour to improve profitability and proof.",
  },
  "/blog/how-to-track-household-spending": {
    title: "How to Track Household Spending",
    description:
      "Simple household spending tracking for food, fuel, utilities, and subscriptions with receipt evidence.",
  },
  "/blog/best-way-to-track-fuel-and-food-spending": {
    title: "Best Way to Track Fuel and Food",
    description:
      "A simple method to track fuel and food spending with receipt capture, tagging, and weekly reviews.",
  },
  "/blog/what-is-receipt-tracking-app": {
    title: "What Is a Receipt Tracking App?",
    description:
      "What a receipt tracking app does for taxes, warranties, and budgeting with searchable digital records.",
  },
  "/blog/how-receipt-tracking-works": {
    title: "How Receipt Tracking Works",
    description:
      "How receipt tracking works in four steps: capture, store, tag, and retrieve records any time.",
  },
  "/blog/why-expense-tracking-fails": {
    title: "Why Expense Tracking Fails",
    description:
      "Why expense tracking fails for many people: bank dependency, manual friction, and weak habits.",
  },
  "/blog/household-vs-contractor-expense-tracking": {
    title: "Household vs Contractor Expense Tracking",
    description:
      "Compare household category tracking with contractor job-cost tracking and when each approach works best.",
  },
};

const NOINDEX_EXACT = new Set([
  "/upload",
  "/receipts",
  "/summary",
  "/profile",
  "/tag-untagged",
  "/auth/callback",
  "/ad-summary-mock",
  "/landing",
  "/landing2",
]);

const APP_DEFAULT: RouteSeo = {
  title: "Snap Tag Track",
  description:
    "Snap, tag, and track receipts with warranty reminders and expense tracking—private, no bank connection required.",
  robots: "noindex, nofollow",
};

export function canonicalUrlForPath(pathname: string): string {
  if (pathname === "/") return `${CANONICAL_ORIGIN}/`;
  return `${CANONICAL_ORIGIN}${pathname}`;
}

export function getRouteSeo(pathname: string): RouteSeo {
  const pub = PUBLIC_ROUTES[pathname];
  if (pub) return pub;

  if (pathname.startsWith("/receipt/") || pathname.startsWith("/admin")) {
    return APP_DEFAULT;
  }

  if (NOINDEX_EXACT.has(pathname)) {
    return APP_DEFAULT;
  }

  return {
    title: "Page not found | Snap Tag Track",
    description: "The page you requested is missing or moved.",
    robots: "noindex, nofollow",
  };
}
