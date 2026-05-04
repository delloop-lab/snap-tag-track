import type { SeoPageBody } from "./types";

export const householdSpendingTrackerBody: SeoPageBody = {
  h1: "Household spending tracker built from real receipts",
  intro: [
    "Household budgets break in small increments: extra grocery runs, school fees, subscriptions you meant to cancel. A household spending tracker that starts from receipts shows what actually happened—not what you remember happening.",
    "Snap Tag Track is not trying to shame spending. It is trying to reduce surprise. When receipts are tagged consistently, you can answer questions like “how much did fuel cost this month?” without opening five different card portals.",
  ],
  sections: [
    {
      h2: "Making family money conversations easier",
      paragraphs: [
        "Shared finances work better when both partners can see the same evidence. If one person handles most purchases, the other still benefits from a shared receipt library. Snap Tag Track runs in the browser so you are not forcing another native app install just to stay aligned.",
        "Pick a small set of tags that match your life: groceries, kids, pets, home repair. Consistency beats granularity. You can always refine tags later once the capture habit exists.",
      ],
    },
    {
      h2: "Warranties and big-ticket items",
      paragraphs: [
        "Appliances and electronics are both budget shocks and warranty-sensitive. Storing the receipt when you buy means fewer arguments later about purchase dates. Pair that with reminders and you reduce the chance a valid warranty expires unused.",
      ],
    },
    {
      h2: "Why receipt-based tracking beats guessing",
      paragraphs: [
        "Memory smooths spikes. Receipts do not. If you want calmer month-end reviews, start with one category you care about—like groceries—and snap for a month. The pattern usually motivates broader use without heavy setup.",
      ],
    },
    {
      h2: "Seasonal costs and school-year rhythms",
      paragraphs: [
        "Households have predictable waves—back to school, holidays, summer travel. A household spending tracker helps you see last year’s wave without rebuilding spreadsheets. Snap receipts during the busy weeks; ignore perfection during quiet weeks.",
        "When kids ask for extras, you can answer from data instead of vibes. That does not mean saying no more often—it means saying yes with awareness.",
        "If you share money with someone who hates finance apps, receipts are easier to explain than bank graphs. The photo is tangible; the tag is plain language.",
      ],
    },
  ],
  faq: [
    {
      question: "Is this only for families with kids?",
      answer:
        "No. Any shared household—roommates, couples, multi-generational homes—benefits from a single receipt-based spending record.",
    },
    {
      question: "How do I split personal vs shared purchases?",
      answer:
        "Use tags or notes on each receipt. Some users tag “shared” vs “personal”; others use separate client-style labels for simplicity.",
    },
    {
      question: "Can I track groceries separately?",
      answer:
        "Yes. Tag grocery receipts consistently and review summaries over time to see trends rather than one-off spikes.",
    },
  ],
};
