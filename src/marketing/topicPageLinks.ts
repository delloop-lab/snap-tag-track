/** Canonical list of crawlable topic URLs (+ labels)—single source for Help hub and homepage grid. */
export type TopicPageLink = {
  path: string;
  title: string;
  hint: string;
};

export const TOPIC_PAGE_LINKS: TopicPageLink[] = [
  { path: "/receipt-scanner-app", title: "Receipt scanner app", hint: "Capture tips and proof-focused scanning." },
  { path: "/how-it-works", title: "How it works", hint: "Snap, tag, track—product flow overview." },
  { path: "/use-cases", title: "Use cases", hint: "Match a workflow before you tweak tags." },
  { path: "/warranty-tracker", title: "Warranty tracker", hint: "Reminders and proof of purchase." },
  { path: "/returns-cooling-off", title: "Returns & cooling-off", hint: "Return windows vs manufacturer warranty." },
  { path: "/expense-tracking-without-bank", title: "Expense tracking without a bank", hint: "Tags and summaries from slips." },
  { path: "/contractor-expense-tracker", title: "Contractor expense tracker", hint: "Job receipts and margins." },
  { path: "/household-spending-tracker", title: "Household spending tracker", hint: "Shared visibility from receipts." },
  { path: "/fuel-food-spending-tracker", title: "Fuel & food spending tracker", hint: "Cash-friendly category trends." },
  { path: "/pricing", title: "Pricing", hint: "Plan limits for your account." },
];
