import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircleQuestion } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";
import HelpReceiptScanningGuide from "@/components/help/HelpReceiptScanningGuide";
import { HELP_SUPPORT_FAQ_SECTIONS } from "@/content/helpSupportFaqData";

const HELP_NAV = [
  { href: "#getting-started", label: "Getting started" },
  { href: "#how-to-scan-receipt", label: "How to scan" },
  { href: "#troubleshooting", label: "Troubleshooting" },
  { href: "#faq", label: "FAQs" },
] as const;

const TROUBLESHOOTING_TIPS = [
  "Blurry image: brace your phone, tap to focus, and wait half a second before shooting.",
  "Harsh shadows: stand so light falls across the receipt evenly; avoid a single spotlight behind you.",
  "Crumpled slip: flatten gently first—retake if any line of totals is unreadable.",
  "Glare on thermal paper: tilt a few degrees until the shine disappears from the amount block.",
  "Huge invoice: step back, capture the full page in one shot, or use upload from gallery for PDFs/photos.",
];

export default function Help() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return;
    const t = window.setTimeout(() => {
      document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <div className={`${marketingPageGutterClass} pb-10`}>
        {!user && <MarketingTopNav active="help" />}

        <header className="border-b border-slate-600/80 pb-8 sm:pb-10">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
              Help Centre
            </p>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Help & support
            </h1>
            <p className="mt-4 max-w-3xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
              This is your help centre—scanning guides, troubleshooting, and answers to common questions are all here.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
              >
                Sign in to the app
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-600"
              >
                Contact support
              </Link>
            </div>
          </div>
        </header>

        <nav
          className="sticky top-0 z-30 -mx-4 border-b border-slate-600/80 bg-slate-800/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
          aria-label="Help Centre sections"
        >
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-2">
            {HELP_NAV.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-[#7CB87E]/50 hover:text-white sm:text-sm"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="mx-auto max-w-6xl space-y-14 px-4 pb-24 pt-10 sm:px-6 lg:px-0">
          <section id="getting-started" className="scroll-mt-28 rounded-2xl border border-slate-600 bg-slate-700/70 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Getting started</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
              You only need a browser. Create an account if you do not have one, then capture your first receipt from
              your phone or desktop.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-200 sm:text-[15px]">
              <li>
                <Link to="/auth" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
                  Sign up or sign in
                </Link>
                .
              </li>
              <li>
                Open <strong className="text-slate-100">Upload</strong> or your receipt list and add a photo (camera or
                file).
              </li>
              <li>Confirm date, vendor, and amount; add tags that match how you think about spend.</li>
              <li>
                Open <strong className="text-slate-100">Summary</strong> when you want totals by tag or time range.
              </li>
            </ol>
          </section>

          <section id="how-to-scan-receipt" className="scroll-mt-28 space-y-8">
            <div className="rounded-2xl border border-slate-600 bg-slate-700/70 p-5 sm:p-6">
              <h2 className="text-xl font-bold text-white sm:text-2xl">How to scan receipts (quick steps)</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-[15px]">
                Minimal in-app checklist. Use the visuals below if your capture keeps failing—with the same illustrations on the{" "}
                <Link to="/receipt-scanner-app" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
                  Receipt scanner guide
                </Link>{" "}
                for search-facing context.
              </p>
              <ol className="mt-5 space-y-3 text-sm text-slate-200 sm:text-[15px]">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7CB87E]/20 text-xs font-bold text-[#7CB87E]">
                    1
                  </span>
                  <span>
                    <strong className="text-slate-100">Sign in</strong> and open <strong className="text-slate-100">Upload</strong>{" "}
                    (or capture from your receipt list).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7CB87E]/20 text-xs font-bold text-[#7CB87E]">
                    2
                  </span>
                  <span>
                    <strong className="text-slate-100">Lay the slip flat,</strong> even light, edges in frame.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7CB87E]/20 text-xs font-bold text-[#7CB87E]">
                    3
                  </span>
                  <span>
                    <strong className="text-slate-100">Shoot or choose a file,</strong> then fix date, totals, vendor if needed.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7CB87E]/20 text-xs font-bold text-[#7CB87E]">
                    4
                  </span>
                  <span>
                    <strong className="text-slate-100">Tag and save</strong>
                    —summaries roll up tags automatically.
                  </span>
                </li>
              </ol>
            </div>
            <HelpReceiptScanningGuide />
          </section>

          <section id="troubleshooting" className="scroll-mt-28 rounded-2xl border border-slate-600 bg-slate-700/70 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Troubleshooting</h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-[15px]">Quick fixes before you re-scan or contact support.</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200 sm:text-[15px]">
              {TROUBLESHOOTING_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <section
            id="faq"
            className="scroll-mt-28 rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20 sm:p-6"
            aria-labelledby="faq-heading"
          >
            <div className="mb-4 flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5 text-[#7CB87E]" aria-hidden />
              <h2 id="faq-heading" className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Help FAQs
              </h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {HELP_SUPPORT_FAQ_SECTIONS.map(({ id, question, content }) => (
                <AccordionItem key={id} value={id} className="border-slate-600">
                  <AccordionTrigger className="text-left text-sm font-semibold text-slate-100 hover:text-white hover:no-underline sm:text-[15px] [&[data-state=open]]:text-[#7CB87E] [&_svg:last-child]:text-slate-500">
                    {question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-slate-300 [&_ul]:text-slate-300">
                    {content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </main>
      </div>

      <SiteFooter variant="slate" />
    </div>
  );
}
