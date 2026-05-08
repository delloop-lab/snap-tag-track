import type { SeoPageBody } from "./types";

export const howItWorksBody: SeoPageBody = {
  h1: "How Snap Tag Track works: snap, tag, track",
  intro: [
    "Snap Tag Track is intentionally simple: capture a receipt, extract useful fields, let you tag it in your own language, then keep everything searchable. The product is built for people who want a receipt tracker and warranty reminders without handing over bank credentials.",
    "Everything runs in your browser. You can start on a phone, review on a laptop, and share context with a partner or bookkeeper without exporting chaos from five different apps.",
    "The workflow is designed to be practical under real conditions—poor lighting, busy schedules, mixed personal/work receipts, and incomplete purchase notes. Progress comes from consistent capture, not from perfect records on day one.",
  ],
  sections: [
    {
      h2: "Step one: capture",
      paragraphs: [
        "Use your camera for paper receipts or upload images of invoices. The app reads text where it can, but you remain in control of corrections. Bad lighting and crumpled paper happen; the goal is good enough data plus a clear image for proof.",
        "A useful habit is capture-now, refine-later. If the image is legible and the main amount/date are present, you can improve tags or notes in a later review session without losing evidence.",
        "For faster scanning, keep receipts flat and avoid heavy shadows. Better input quality usually improves extraction quality more than any post-processing tweak.",
      ],
    },
    {
      h2: "Step two: tag and organise",
      paragraphs: [
        "Tags are free-form because households and contractors think differently. Some users tag by room, by client, or by budget line. Others keep it minimal: “personal”, “work”, “tax”. The system does not force a chart of accounts on you.",
        "If you use warranties, add dates or notes while memory is fresh. That small extra effort pays off months later.",
        "Start with a short tag list and evolve it only when reports stop being useful. A compact taxonomy creates cleaner trends and avoids duplicate labels that fragment totals.",
      ],
    },
    {
      h2: "Step three: review and remind",
      paragraphs: [
        "Summaries show where money went by tag and time range. Warranty reminders nudge you before windows close. Neither feature requires a bank link—only the receipts you chose to store.",
        "A monthly review takes less effort when capture is consistent. Instead of rebuilding history, you can spot outliers quickly and make decisions from verified receipt data.",
      ],
    },
    {
      h2: "Where to go next",
      paragraphs: [
        "If you want deeper walkthroughs, read the Help centre for scan tips and FAQs. When you are ready, create a free account and try a week of real receipts—small volume beats perfect setup.",
        "After one week, assess whether search, tags, and reminders answered real questions faster than your old method. If yes, scale up to full monthly usage.",
      ],
    },
    {
      h2: "Common pitfalls—and how to avoid them",
      paragraphs: [
        "Perfectionism kills adoption. If you wait for ideal lighting every time, you will scan nothing. Capture first, retake later only when a receipt is unreadable.",
        "Over-tagging early creates noise. Start with three to five tags you actually care about. Split tags only when summaries stop answering your real questions.",
        "Ignoring warranties on small purchases is fine; ignoring them on anything over your personal pain threshold is not. Use reminders where money or time is at stake.",
      ],
    },
    {
      h2: "A practical first-month workflow",
      paragraphs: [
        "Week 1: scan receipts consistently. Week 2: normalize tags. Week 3: review summaries and adjust labels. Week 4: add warranty context for high-value purchases.",
        "This cadence keeps setup lightweight while still producing useful data. You avoid the common trap of over-designing the system before you know what questions you actually need answered.",
      ],
    },
  ],
  faq: [
    {
      question: "Do I need to install an app from an app store?",
      answer:
        "Snap Tag Track is a web application. Open it in a modern mobile browser and add to home screen if you like—no store install required.",
    },
    {
      question: "Does it work offline?",
      answer:
        "You can capture when connectivity is weak and sync when you are back online. Exact behaviour can vary by device; see Help for practical guidance.",
    },
    {
      question: "Is there a free tier?",
      answer:
        "See the pricing page for current limits and what is included at no charge.",
    },
    {
      question: "How long does setup usually take?",
      answer:
        "Most users can create an account and complete first receipt capture within minutes. Useful trends emerge after 2–4 weeks of steady usage.",
    },
    {
      question: "Can I use it for both personal and business receipts?",
      answer:
        "Yes. Use clear tags or client labels so both contexts stay separable in summaries and searches.",
    },
  ],
};
