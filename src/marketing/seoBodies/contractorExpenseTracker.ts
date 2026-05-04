import type { SeoPageBody } from "./types";

export const contractorExpenseTrackerBody: SeoPageBody = {
  h1: "Contractor expense tracker for job receipts and proof",
  intro: [
    "Contractors live in a world of partial payments, materials bought on personal cards, and receipts that belong to a client, not to “general spending.” A contractor expense tracker should make it obvious which job a receipt belongs to and keep images ready for claims or tax support.",
    "Snap Tag Track uses tags and client fields so you can separate work from household purchases without maintaining two completely different systems—especially if you are a solo operator wearing both hats.",
  ],
  sections: [
    {
      h2: "Job-level tagging that survives the week",
      paragraphs: [
        "The failure mode for field teams is always the same: receipts in pockets, photos in camera rolls, and nothing tied to a job name. The fix is a capture habit at the point of purchase: snap, tag the client or job code, move on. Snap Tag Track is designed for quick tagging so the habit sticks.",
        "When you reconcile later, you are not guessing which van trip matched which invoice. That clarity is what makes a contractor receipt tracker more than a photo album.",
      ],
    },
    {
      h2: "Warranties on tools and equipment",
      paragraphs: [
        "Power tools and gear often carry warranties separate from the job invoice. Store the retail receipt and note the serial where possible. A warranty reminder before expiry can save hundreds on a failed motor or battery pack—especially on branded gear you rely on daily.",
      ],
    },
    {
      h2: "Why visual proof still matters",
      paragraphs: [
        "Text-only ledgers miss context: VAT lines, handwritten notes, or return windows printed on the slip. Keeping the receipt image next to parsed fields preserves defensibility if a supplier disputes a charge.",
      ],
    },
    {
      h2: "Handoff to your accountant without drama",
      paragraphs: [
        "Accountants do not fear volume—they fear ambiguity. When job receipts are tagged and images are legible, questions shrink. A contractor expense tracker is not a replacement for professional advice, but it lowers the cost of asking good questions.",
        "Keep materials separate from mileage where your jurisdiction cares. Snap Tag Track gives you the buckets; you still choose what belongs where.",
        "If you work with a bookkeeper, agree on tag vocabulary once. Rename later if needed—consistency over time matters more than perfect labels on week one.",
      ],
    },
  ],
  faq: [
    {
      question: "Can I tag both a client and a category?",
      answer:
        "Yes. Use tags for categories like fuel or materials, and client fields where you track billable work—adapt the scheme to how you already think about jobs.",
    },
    {
      question: "Does Snap Tag Track integrate with accounting software?",
      answer:
        "It focuses on capture and organisation in-browser. Many users export or copy summaries into their accountant’s workflow; see Help for current options.",
    },
    {
      question: "What if I buy materials with cash?",
      answer:
        "Cash purchases are exactly where bank feeds fail. A receipt photo plus a tag is the cleanest record you can create at the point of sale.",
    },
  ],
};
