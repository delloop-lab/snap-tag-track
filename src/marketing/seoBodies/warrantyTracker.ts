import type { SeoPageBody } from "./types";

export const warrantyTrackerBody: SeoPageBody = {
  h1: "Warranty tracker for receipts, dates, and expiry reminders",
  intro: [
    "A warranty tracker only works if the proof of purchase is where you expect it. Paper fades, email inboxes overflow, and retailer portals forget old orders. Snap Tag Track stores receipt images with purchase metadata so you can answer “when did I buy this?” without a forensic search.",
    "The goal is not perfect accounting. The goal is confidence: when something breaks inside the warranty window, you have a clear trail from product to receipt to date.",
  ],
  sections: [
    {
      h2: "What a practical warranty app should store",
      paragraphs: [
        "At minimum, store the receipt image, purchase date, vendor, and product context (model, serial if available). Snap Tag Track lets you tag items so you can filter by room, vehicle, or job. When a reminder fires, you are not reconstructing a story from memory—you are opening a record you already trusted enough to save.",
        "If you manage warranties for a household, agree on one workflow: snap at purchase, tag with a simple scheme like “kitchen” or “kids”, and review reminders monthly. Small consistency beats a complex system nobody uses.",
      ],
    },
    {
      h2: "Contractors and small teams",
      paragraphs: [
        "On job sites, warranties attach to tools and materials that move. A warranty tracker that works offline-ish—capture now, sync later—reduces the chance you lose proof because signal was weak when you paid. Tag by client or job so warranty claims do not get mixed with personal purchases.",
      ],
    },
    {
      h2: "Linking warranties to expense tracking",
      paragraphs: [
        "Warranty risk and spend risk are related: high-ticket items often carry better return policies. When your warranty app sits beside expense tracking, you can see both cost and protection for major purchases. That context helps you decide whether an extended warranty is worth it next time.",
      ],
    },
    {
      h2: "Operational habits that keep warranties honest",
      paragraphs: [
        "Pick a single place receipts live—this app—and stop letting retailer emails be your system of record. Emails disappear; accounts merge; portals redesign. A PDF in your inbox is better than nothing, but a tagged receipt image plus dates is stronger.",
        "When you buy something with a known failure mode—washers, laptops, power tools—take thirty seconds to photograph the serial plate. That detail is what turns a warranty tracker from a calendar into a claim-ready file.",
        "Review reminders quarterly even if nothing failed. The point is to catch expiries before they matter, not to create another guilt dashboard.",
      ],
    },
  ],
  faq: [
    {
      question: "How are warranty reminders calculated?",
      answer:
        "You record purchase date and warranty length where applicable. Snap Tag Track uses that information to help you notice upcoming expiries—always verify critical dates against the receipt text.",
    },
    {
      question: "Can I attach a product photo as well as the receipt?",
      answer:
        "Yes. Visual evidence for warranties often includes packaging or serial plates; storing it next to the receipt strengthens your record.",
    },
    {
      question: "Is Snap Tag Track only a warranty tracker?",
      answer:
        "It also supports receipt scanning, tagging, and spending summaries. Many users start for warranties and keep using it for ongoing expense tracking.",
    },
  ],
};
