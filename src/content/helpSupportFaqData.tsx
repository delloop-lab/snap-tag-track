import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type HelpSupportFaqSection = {
  id: string;
  question: string;
  answerPlain: string;
  content: ReactNode;
};

/**
 * Help Centre only: in-app usage, account, and support.
 * Do not duplicate marketing / SEO FAQs that live on topic landing pages.
 */
export const HELP_SUPPORT_FAQ_SECTIONS: HelpSupportFaqSection[] = [
  {
    id: "where-upload",
    question: "Where do I upload or capture a receipt?",
    answerPlain:
      "Use Upload from the main menu after signing in, or add from your receipt list. You can use the camera or pick a file from your device.",
    content: (
      <p className="text-sm">
        Open <strong className="text-slate-100">Upload</strong> from the app menu, or start from{" "}
        <strong className="text-slate-100">Receipts</strong> if you prefer. For capture quality tips and examples, see
        the{" "}
        <Link to="/receipt-scanner-app" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
          receipt scanner guide
        </Link>
        .
      </p>
    ),
  },
  {
    id: "warranty-settings",
    question: "Where do I set warranty length, return window, and currency?",
    answerPlain:
      "Open Profile → Receipts & defaults. Save Settings applies your warranty default, cooling-off days, and display currency.",
    content: (
      <p className="text-sm">
        Go to <strong className="text-slate-100">Profile</strong>, scroll to <strong className="text-slate-100">Warranty, returns &amp; currency</strong>, adjust values, then click{" "}
        <strong className="text-slate-100">Save Settings</strong>. These defaults apply when a receipt is missing data.
        For what the law means in your country, read our{" "}
        <Link to="/returns-cooling-off" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
          returns &amp; cooling-off overview
        </Link>
        .
      </p>
    ),
  },
  {
    id: "tags-summary",
    question: "How do tags and Summary work together?",
    answerPlain:
      "You tag receipts in your own words. Summary rolls up totals and trends by tag and date range so you can review spending without a bank feed.",
    content: (
      <p className="text-sm">
        Tag when you save or edit a receipt. Open <strong className="text-slate-100">Summary</strong> to filter by tag
        and time range. For the bigger picture on expense tracking without a bank link, see{" "}
        <Link
          to="/expense-tracking-without-bank"
          className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline"
        >
          expense tracking without a bank
        </Link>
        .
      </p>
    ),
  },
  {
    id: "export-share",
    question: "Can I export or share my records?",
    answerPlain:
      "Use lists and summaries inside the app for day-to-day review. For formal export needs, check current product capabilities in Contact or support email.",
    content: (
      <p className="text-sm">
        Built-in views are designed for search and review. If you need a spreadsheet or accountant handoff,{" "}
        <Link to="/contact" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
          contact us
        </Link>{" "}
        so we can point you at the latest options.
      </p>
    ),
  },
  {
    id: "pricing-limits",
    question: "How much does Snap Tag Track cost?",
    answerPlain: "Until further notice Snap Tag Track is free to use with a limit of 35 receipt scans per year.",
    content: (
      <p className="text-sm">
        The app is free for now with a yearly scan limit. See{" "}
        <Link to="/pricing" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
          Pricing
        </Link>{" "}
        for current details.
      </p>
    ),
  },
  {
    id: "browser-offline",
    question: "Which browsers work? Can I use it on my phone?",
    answerPlain:
      "Use a current version of Chrome, Safari, Firefox, or Edge. Snap Tag Track is a web app—add to home screen on mobile if you like.",
    content: (
      <p className="text-sm">
        A modern mobile or desktop browser is enough. You do not need an app store install. If a page fails to load,
        try updating the browser or clearing site data for this domain.
      </p>
    ),
  },
];
