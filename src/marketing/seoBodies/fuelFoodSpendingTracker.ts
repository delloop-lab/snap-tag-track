import type { SeoPageBody } from "./types";

export const fuelFoodSpendingTrackerBody: SeoPageBody = {
  h1: "Fuel and food spending tracker from receipts you already have",
  intro: [
    "Fuel and food are the two categories that leak fastest because they happen often and in small amounts. A spending tracker that uses receipts catches the real total—including cash and secondary cards—instead of whatever happened to post to one account.",
    "Snap Tag Track lets you tag fuel separately from groceries even when both happen on the same day. That separation is what turns a pile of slips into actionable insight.",
    "Instead of chasing perfect budgets, this workflow focuses on reducing blind spots. When recurring categories are visible, decisions become incremental and realistic.",
  ],
  sections: [
    {
      h2: "Why fuel receipts matter beyond the litre price",
      paragraphs: [
        "Fuel receipts often include station, time, and volume. That context helps when mileage claims, client reimbursements, or household budgeting need proof. Snapping at the pump takes seconds and removes the “I think it was about…” guesswork later.",
        "If you drive for work even part-time, separating fuel tags for reimbursable travel from personal trips saves pain at month end. Consistency in tagging matters more than perfect category names.",
        "Fuel receipts can also reveal behavioural patterns like frequent small top-ups versus planned fills. Those patterns matter when comparing convenience against total monthly cost.",
      ],
    },
    {
      h2: "Groceries: receipts beat memory for price drift",
      paragraphs: [
        "Food inflation shows up as slightly higher totals on similar baskets. Without receipts, humans anchor on old prices. With receipts, you can compare month to month honestly—even if the answer is annoying.",
        "You do not need to scan every sweet snack. Start with your main weekly shop. Once the habit exists, extending to smaller runs is easier.",
        "Comparing stores works better with vendor-level tags and consistent category naming. The goal is not to eliminate all variation, but to spot persistent shifts in core spending.",
      ],
    },
    {
      h2: "Pairing spending visibility with warranty coverage",
      paragraphs: [
        "Some grocery-adjacent purchases—small appliances, electronics bundles—carry warranties. The same receipt that informs food spend can also anchor a warranty reminder if you note the product context.",
        "Keeping spending and warranty records together prevents duplicate admin. One capture event can support monthly budgeting and future claim evidence.",
      ],
    },
    {
      h2: "Weekly cadence that does not burn you out",
      paragraphs: [
        "Try a ten-minute Sunday scan: snap anything sitting in your wallet, tag fuel and groceries quickly, ignore edge cases until next week. Small loops beat heroic end-of-month marathons.",
        "If you shop multiple stores, keep vendor names visible in summaries so you can spot which chain drifted upward. That specificity is hard to see inside a single merged card feed.",
        "When prices jump, receipts show whether pack sizes changed. That detail matters for households optimising staples without turning dinner into a spreadsheet.",
      ],
    },
    {
      h2: "A low-friction 4-week test",
      paragraphs: [
        "Week 1: capture all fuel receipts and one main grocery trip. Week 2: add smaller top-up shops. Week 3: compare totals by vendor. Week 4: decide what to keep as a permanent habit.",
        "This test reveals whether your biggest wins come from route choices, store choices, or simple frequency changes. Data clarity helps you prioritise the easiest improvements first.",
      ],
    },
  ],
  faq: [
    {
      question: "Can I filter only fuel for last month?",
      answer:
        "Use tags like “fuel” consistently, then review summaries for the period you care about.",
    },
    {
      question: "What if I lose the paper receipt?",
      answer:
        "Digital photos still help if you captured them in time. For fuel, many stations offer emailed receipts—forward or screenshot those into the same habit.",
    },
    {
      question: "Does Snap Tag Track estimate nutrition?",
      answer:
        "No. It focuses on financial capture and organisation from receipts, not calorie tracking.",
    },
    {
      question: "Can I track fuel for multiple vehicles?",
      answer:
        "Yes. Use distinct tags or notes per vehicle so totals remain separable for household or business analysis.",
    },
    {
      question: "Should I scan every single food receipt?",
      answer:
        "Not necessarily. Start with your largest recurring shops, then add smaller purchases if you need finer visibility.",
    },
  ],
};
