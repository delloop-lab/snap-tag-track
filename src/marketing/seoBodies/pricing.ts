import type { SeoPageBody } from "./types";

export const pricingBody: SeoPageBody = {
  h1: "Pricing: Snap Tag Track free tier and limits",
  intro: [
    "Snap Tag Track aims to stay approachable while costs for storage and processing exist. The current model is simple: a free tier with a yearly scan limit so hobby users can try the product seriously without upfront payment.",
    "Always confirm the latest numbers in-app or in Help before planning around limits—this page describes the intent of the model even if specifics change.",
  ],
  sections: [
    {
      h2: "What the free tier is for",
      paragraphs: [
        "The free tier is meant for households and solo contractors who want a receipt scanner, basic expense tracking, and warranty reminders without subscribing first. If you hit limits, you still keep what you already stored; you are not penalised for past organisation.",
      ],
    },
    {
      h2: "Why limits exist",
      paragraphs: [
        "Receipt OCR and image storage are not free at scale. A cap keeps abuse low and keeps the service sustainable for real users. If your volume grows beyond the free tier, contact the team about future paid options—roadmaps evolve with demand.",
      ],
    },
    {
      h2: "Try before you commit",
      paragraphs: [
        "Create an account, scan a handful of real receipts, and see whether tagging matches your workflow. If it does, the limit becomes a planning number rather than a barrier. If it does not, you have lost little beyond a short experiment.",
      ],
    },
    {
      h2: "Transparency beats surprise billing",
      paragraphs: [
        "If paid tiers arrive later, the goal will be straightforward packaging: who each plan serves and what limits change. This page will stay aligned with in-app truth rather than marketing adjectives.",
        "Until then, treat the free tier as a serious trial: real receipts, real tags, real summaries. That is the fastest way to learn if Snap Tag Track belongs in your weekly routine.",
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
  ],
};
