import type { SeoPageBody } from "./types";

export const pricingBody: SeoPageBody = {
  h1: "Pricing: Snap Tag Track free tier and limits",
  intro: [
    "Snap Tag Track aims to stay approachable while costs for storage and processing exist. The current model is simple: a free tier with a yearly scan limit so hobby users can try the product seriously without upfront payment.",
    "Always confirm the latest numbers in-app or in Help before planning around limits—this page describes the intent of the model even if specifics change.",
    "Pricing should help users make clear decisions, not decode ambiguous plan names. The aim is to keep the value proposition transparent: what you can do today, what limits apply, and when an upgrade would actually be useful.",
  ],
  sections: [
    {
      h2: "What the free tier is for",
      paragraphs: [
        "The free tier is meant for households and solo contractors who want a receipt scanner, basic expense tracking, and warranty reminders without subscribing first. If you hit limits, you still keep what you already stored; you are not penalised for past organisation.",
        "This makes the free tier a realistic test environment, not a demo with toy restrictions. You can run real receipts through your actual workflow before deciding whether ongoing usage justifies a paid plan later.",
      ],
    },
    {
      h2: "Why limits exist",
      paragraphs: [
        "Receipt OCR and image storage are not free at scale. A cap keeps abuse low and keeps the service sustainable for real users. If your volume grows beyond the free tier, contact the team about future paid options—roadmaps evolve with demand.",
        "Reasonable limits also protect experience quality for all users by preventing runaway workloads from degrading capture and search performance.",
      ],
    },
    {
      h2: "Try before you commit",
      paragraphs: [
        "Create an account, scan a handful of real receipts, and see whether tagging matches your workflow. If it does, the limit becomes a planning number rather than a barrier. If it does not, you have lost little beyond a short experiment.",
        "A strong trial is outcome-based: can you find receipts quickly, answer spend questions clearly, and act on warranty reminders in time? If yes, the product is doing its job regardless of plan tier.",
      ],
    },
    {
      h2: "Transparency beats surprise billing",
      paragraphs: [
        "If paid tiers arrive later, the goal will be straightforward packaging: who each plan serves and what limits change. This page will stay aligned with in-app truth rather than marketing adjectives.",
        "Until then, treat the free tier as a serious trial: real receipts, real tags, real summaries. That is the fastest way to learn if Snap Tag Track belongs in your weekly routine.",
      ],
    },
    {
      h2: "How to evaluate value in your first month",
      paragraphs: [
        "Measure value by time saved and mistakes avoided. If receipt retrieval, reimbursement support, or warranty claim preparation gets materially easier, the tool is creating operational value beyond its headline features.",
        "For households, compare monthly review effort before and after consistent receipt capture. For contractors, compare dispute and bookkeeping prep effort with and without tagged receipt evidence.",
        "If your volume is near limits, plan your scanning cadence around high-value receipts first so the free allowance is used where proof matters most.",
      ],
    },
    {
      h2: "When to contact support about limits",
      paragraphs: [
        "Reach out when your workload exceeds free-tier assumptions or when your use case needs clearer packaging guidance. Sharing expected monthly volume helps the team shape practical plan options.",
        "If you are evaluating for a team, include number of users, receipt volume, and whether warranty reminders are mission-critical. That context improves roadmap prioritisation and response quality.",
      ],
    },
  ],
  faq: [
    {
      question: "Where can I see the exact scan limit?",
      answer:
        "Check the Help FAQ on pricing or your in-app account area for the current yearly allowance.",
    },
    {
      question: "Are warranties a paid feature?",
      answer:
        "Warranty reminders are part of the core product experience on supported plans; verify current feature packaging in Help.",
    },
    {
      question: "Do you sell my receipt data?",
      answer:
        "Read the privacy policy for data handling. The product is built around user-controlled capture rather than reselling bank-style transaction streams.",
    },
    {
      question: "Do I lose receipts if I stop using the product for a while?",
      answer:
        "Your existing records are intended to remain accessible according to current product policies. Check Help and account settings for the latest retention details.",
    },
    {
      question: "Is pricing different for personal and contractor use?",
      answer:
        "Current packaging is designed to support both, but usage patterns differ. If your volume is business-heavy, contact support with your expected scan count for guidance.",
    },
  ],
};
