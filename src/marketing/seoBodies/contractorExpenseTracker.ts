import type { SeoPageBody } from "./types";

export const contractorExpenseTrackerBody: SeoPageBody = {
  h1: "Contractor expense tracker for job receipts and proof",
  intro: [
    "Contractors live in a world of partial payments, materials bought on personal cards, and receipts that belong to a client, not to “general spending.” A contractor expense tracker should make it obvious which job a receipt belongs to and keep images ready for claims or tax support.",
    "Snap Tag Track uses tags and client fields so you can separate work from household purchases without maintaining two completely different systems—especially if you are a solo operator wearing both hats.",
    "The core objective is operational clarity: less time hunting paperwork, fewer reimbursement disputes, and faster month-end handoff to bookkeeping or tax prep.",
  ],
  sections: [
    {
      h2: "Job-level tagging that survives the week",
      paragraphs: [
        "The failure mode for field teams is always the same: receipts in pockets, photos in camera rolls, and nothing tied to a job name. The fix is a capture habit at the point of purchase: snap, tag the client or job code, move on. Snap Tag Track is designed for quick tagging so the habit sticks.",
        "When you reconcile later, you are not guessing which van trip matched which invoice. That clarity is what makes a contractor receipt tracker more than a photo album.",
        "A simple naming convention helps: client-code plus short descriptor. Consistent tags reduce ambiguity when several jobs run in parallel.",
      ],
    },
    {
      h2: "Warranties on tools and equipment",
      paragraphs: [
        "Power tools and gear often carry warranties separate from the job invoice. Store the retail receipt and note the serial where possible. A warranty reminder before expiry can save hundreds on a failed motor or battery pack—especially on branded gear you rely on daily.",
        "For fleet tools, include who uses the item most often so breakdown reports have context. This small note improves replacement and maintenance decisions later.",
      ],
    },
    {
      h2: "Why visual proof still matters",
      paragraphs: [
        "Text-only ledgers miss context: VAT lines, handwritten notes, or return windows printed on the slip. Keeping the receipt image next to parsed fields preserves defensibility if a supplier disputes a charge.",
        "Visual proof is also helpful when customers question billable materials. A clear receipt image shortens negotiation cycles and improves confidence in your records.",
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
    {
      h2: "Weekly operations checklist for small teams",
      paragraphs: [
        "Set one fixed admin slot each week to clear untagged receipts, verify legibility, and flag high-value purchases for warranty context. Short, regular maintenance prevents end-of-quarter document panic.",
        "If multiple people buy materials, align on a single capture standard: scan immediately, tag client, add one-line note only when needed. Lightweight rules outperform complex policies no one follows.",
      ],
    },
    {
      h2: "Reducing reimbursement friction",
      paragraphs: [
        "Reimbursement delays often come from missing fields, not disputed amounts. Date, vendor, total, and job tag should be visible by default on every receipt record.",
        "When reimbursements are partial, notes can capture what portion relates to the job. This keeps records usable without creating duplicate entries.",
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
    {
      question: "Can this help with VAT/tax preparation?",
      answer:
        "It helps organise proof and categorisation for your accountant or tax process. Always confirm jurisdiction-specific treatment with a qualified professional.",
    },
    {
      question: "What is the best minimum tag setup for contractors?",
      answer:
        "Start with client/job tag plus 3–5 spend categories such as materials, fuel, tools, and misc. Expand only when reporting needs require more detail.",
    },
  ],
};
