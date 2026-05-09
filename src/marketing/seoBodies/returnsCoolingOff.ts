import type { SeoPageBody } from "./types";

/** Indexable topic: returns / cooling-off intent (distinct from warranty proof mechanics). */
export const returnsCoolingOffBody: SeoPageBody = {
  h1: "Returns, cooling-off periods, and receipt proof",
  intro: [
    "Return windows and cooling-off rules depend on where you bought the item and local consumer law. Snap Tag Track does not give legal advice—but it does help you keep dated proof, photos, and notes next to the receipt so you can act before a deadline passes.",
    "Use Profile defaults for a personal reminder window, then verify every critical date against the retailer policy printed on your receipt or confirmation email.",
  ],
  sections: [
    {
      h2: "Why proof still matters",
      paragraphs: [
        "Many return disputes fail for boring reasons: missing slip, unclear purchase date, or a mismatch between the card charge and the item. A clear receipt image plus your own notes closes that gap faster than searching email threads months later.",
      ],
    },
    {
      h2: "How Snap Tag Track helps",
      paragraphs: [
        "Capture the receipt when you buy, add a short note if the policy is unusual, and set reminders that match your comfort level. Pair this page with the warranty tracker guide when the product also carries a manufacturer warranty.",
      ],
    },
  ],
  faq: [
    {
      question: "Does Snap Tag Track enforce return deadlines for me?",
      answer:
        "No. It stores evidence and optional reminders you configure. Legal cooling-off periods vary by jurisdiction and purchase type—you must confirm rules that apply to you.",
    },
    {
      question: "Where do I set my personal reminder window?",
      answer:
        "Open Profile → Receipts & defaults → Cooling-off Period (days), then Save Settings. That value is for your planning only and does not change retailer policies.",
    },
    {
      question: "How is this different from warranty tracking?",
      answer:
        "Warranty tracking focuses on manufacturer coverage and proof of purchase. Returns and cooling-off focus on retailer policy and short refund windows. Many purchases benefit from both contexts stored together.",
    },
  ],
};
