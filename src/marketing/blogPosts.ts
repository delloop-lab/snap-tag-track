export type BlogPost = {
  slug: string;
  path: string;
  h1: string;
  title: string;
  description: string;
  paragraphs: string[];
  bullets?: string[];
  faq?: { question: string; answer: string }[];
  relatedSlugs: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-track-receipts-for-taxes",
    path: "/blog/how-to-track-receipts-for-taxes",
    h1: "How to Track Receipts for Taxes (Without Losing Anything)",
    title: "Track Receipts for Taxes | Snap Tag Track",
    description: "How to track receipts for taxes with digital storage, tags, and search so you do not miss deductions.",
    paragraphs: [
      "Tracking receipts for tax purposes is one of the simplest ways to avoid stress during tax season. Most people still rely on paper folders or email searches, which breaks quickly.",
      "If you are self-employed or a contractor, receipts are proof of deductible expenses. Without them you risk missing deductions or overpaying tax.",
      "Best method:",
    ],
    bullets: [
      "Capture receipt immediately after purchase",
      "Store digitally",
      "Tag by category (fuel, tools, food, travel)",
      "Keep searchable",
    ],
    faq: [
      { question: "Do I need physical receipts?", answer: "No, digital is usually enough." },
      { question: "Can I track multiple jobs?", answer: "Yes, tag per job." },
    ],
    relatedSlugs: ["contractor-expense-tracking-explained", "how-to-track-expenses-without-bank"],
  },
  {
    slug: "how-to-claim-warranty-without-receipt",
    path: "/blog/how-to-claim-warranty-without-receipt",
    h1: "How to Claim Warranty Without a Paper Receipt",
    title: "Claim Warranty Without Receipt | Snap Tag Track",
    description: "How to claim warranty with digital receipts, purchase dates, and expiry reminders before coverage ends.",
    paragraphs: [
      "Most people lose warranties because they lose receipts.",
      "Solution:",
    ],
    bullets: [
      "Save receipt instantly",
      "System records purchase date",
      "Warranty expiry is calculated automatically",
      "Reminders before expiry",
    ],
    faq: [
      { question: "Can I use a photo?", answer: "Yes." },
      { question: "What if I lose receipt?", answer: "Not if stored digitally." },
    ],
    relatedSlugs: ["how-receipt-tracking-works", "what-is-receipt-tracking-app"],
  },
  {
    slug: "how-to-track-expenses-without-bank",
    path: "/blog/how-to-track-expenses-without-bank",
    h1: "How to Track Expenses Without Connecting Your Bank",
    title: "Track Expenses Without Bank | Snap Tag Track",
    description: "Expense tracking without bank sync using manual receipt capture, categories, and private totals.",
    paragraphs: ["Many users don’t want bank syncing due to privacy.", "Alternative:"],
    bullets: ["Capture receipts manually", "Tag categories", "Track totals by category or job"],
    faq: [{ question: "What are the main benefits?", answer: "Full privacy, works offline, and includes cash spending." }],
    relatedSlugs: ["why-expense-tracking-fails", "what-is-receipt-tracking-app"],
  },
  {
    slug: "contractor-expense-tracking-explained",
    path: "/blog/contractor-expense-tracking-explained",
    h1: "Contractor Expense Tracking Explained",
    title: "Contractor Expense Tracking Explained",
    description: "How contractors can tag expenses per job, track fuel/materials/labour, and monitor profitability.",
    paragraphs: ["Contractors lose money due to untracked job costs.", "Fix:"],
    bullets: ["Tag expenses per job", "Track materials, fuel, labour", "Monitor job profitability"],
    relatedSlugs: ["how-to-track-receipts-for-taxes", "household-vs-contractor-expense-tracking"],
  },
  {
    slug: "how-to-track-household-spending",
    path: "/blog/how-to-track-household-spending",
    h1: "How to Track Household Spending Easily",
    title: "Track Household Spending Easily",
    description: "Simple household spending tracking across food, fuel, utilities, and subscriptions.",
    paragraphs: ["Households often don’t know where money goes.", "Track:"],
    bullets: ["Food", "Fuel", "Utilities", "Subscriptions"],
    relatedSlugs: ["best-way-to-track-fuel-and-food-spending", "household-vs-contractor-expense-tracking"],
  },
  {
    slug: "best-way-to-track-fuel-and-food-spending",
    path: "/blog/best-way-to-track-fuel-and-food-spending",
    h1: "Best Way to Track Fuel and Food Spending",
    title: "Track Fuel and Food Spending Better",
    description: "Best method to track fuel and food spend with receipt capture, tags, and weekly review.",
    paragraphs: ["Fuel and food are the biggest invisible expenses.", "Method:"],
    bullets: ["Capture receipts", "Tag fuel or food", "Review weekly totals"],
    relatedSlugs: ["how-to-track-household-spending", "how-to-track-expenses-without-bank"],
  },
  {
    slug: "what-is-receipt-tracking-app",
    path: "/blog/what-is-receipt-tracking-app",
    h1: "What Is a Receipt Tracking App?",
    title: "What Is a Receipt Tracking App?",
    description: "What a receipt tracking app does for taxes, warranties, and budgeting with digital records.",
    paragraphs: ["A receipt tracking app stores and organises purchase receipts digitally.", "Use cases:"],
    bullets: ["Taxes", "Warranties", "Budgeting"],
    relatedSlugs: ["how-receipt-tracking-works", "how-to-track-receipts-for-taxes"],
  },
  {
    slug: "how-receipt-tracking-works",
    path: "/blog/how-receipt-tracking-works",
    h1: "How Receipt Tracking Works",
    title: "How Receipt Tracking Works",
    description: "How receipt tracking works in four steps: capture, store, tag, and retrieve.",
    paragraphs: ["Steps:"],
    bullets: ["Capture receipt", "Store digitally", "Tag category", "Retrieve anytime"],
    relatedSlugs: ["what-is-receipt-tracking-app", "how-to-claim-warranty-without-receipt"],
  },
  {
    slug: "why-expense-tracking-fails",
    path: "/blog/why-expense-tracking-fails",
    h1: "Why Expense Tracking Fails for Most People",
    title: "Why Expense Tracking Fails",
    description: "Why expense tracking fails: bank dependency, too much manual entry, and no habit formation.",
    paragraphs: ["Most systems fail due to complexity.", "Issues:"],
    bullets: ["Bank dependency", "Too much manual entry", "No habit formation"],
    relatedSlugs: ["how-to-track-expenses-without-bank", "how-to-track-household-spending"],
  },
  {
    slug: "household-vs-contractor-expense-tracking",
    path: "/blog/household-vs-contractor-expense-tracking",
    h1: "Household vs Contractor Expense Tracking",
    title: "Household vs Contractor Expenses",
    description: "Key differences between household category tracking and contractor job-cost tracking.",
    paragraphs: [
      "Households track categories. Contractors track jobs.",
      "Households:",
      "Contractors:",
    ],
    bullets: ["Food, fuel, bills", "Job costs, materials, travel"],
    relatedSlugs: ["contractor-expense-tracking-explained", "how-to-track-household-spending"],
  },
];

export const BLOG_POSTS_BY_SLUG: Record<string, BlogPost> = Object.fromEntries(
  BLOG_POSTS.map((post) => [post.slug, post]),
);
