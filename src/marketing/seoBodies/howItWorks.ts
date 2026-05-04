import type { SeoPageBody } from "./types";

export const howItWorksBody: SeoPageBody = {
  h1: "How Snap Tag Track works: snap, tag, track",
  intro: [
    "Snap Tag Track is intentionally simple: capture a receipt, extract useful fields, let you tag it in your own language, then keep everything searchable. The product is built for people who want a receipt tracker and warranty reminders without handing over bank credentials.",
    "Everything runs in your browser. You can start on a phone, review on a laptop, and share context with a partner or bookkeeper without exporting chaos from five different apps.",
  ],
  sections: [
    {
      h2: "Step one: capture",
      paragraphs: [
        "Use your camera for paper receipts or upload images of invoices. The app reads text where it can, but you remain in control of corrections. Bad lighting and crumpled paper happen; the goal is good enough data plus a clear image for proof.",
      ],
    },
    {
      h2: "Step two: tag and organise",
      paragraphs: [
        "Tags are free-form because households and contractors think differently. Some users tag by room, by client, or by budget line. Others keep it minimal: “personal”, “work”, “tax”. The system does not force a chart of accounts on you.",
        "If you use warranties, add dates or notes while memory is fresh. That small extra effort pays off months later.",
      ],
    },
    {
      h2: "Step three: review and remind",
      paragraphs: [
        "Summaries show where money went by tag and time range. Warranty reminders nudge you before windows close. Neither feature requires a bank link—only the receipts you chose to store.",
      ],
    },
    {
      h2: "Where to go next",
      paragraphs: [
        "If you want deeper walkthroughs, read the Help centre for scan tips and FAQs. When you are ready, create a free account and try a week of real receipts—small volume beats perfect setup.",
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
  ],
};
