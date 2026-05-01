import { useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Home,
  Layers,
  Mail,
  MessageCircleQuestion,
  RectangleHorizontal,
  ScrollText,
  SunMedium,
  FileStack,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/** Rich FAQ entries (accordion). Order is fixed; pricing last. */
const HELP_FAQ_SECTIONS: { id: string; question: string; content: ReactNode }[] = [
  {
    id: "what-is-snaptagtrack",
    question: "What is SnapTagTrack?",
    content: (
      <div className="space-y-3">
        <p>
          SnapTagTrack is a simple way to turn messy, real-world purchases into clean, organised records.
        </p>
        <p>
          Instead of typing everything manually, you just snap a receipt, tag it, and it becomes
          searchable, trackable, and useful later.
        </p>
        <p className="font-medium text-slate-100">It&apos;s built for one job:</p>
        <p>
          Make sure you never lose track of what you&apos;ve spent, what you&apos;ve bought, or what you
          might need again.
        </p>
      </div>
    ),
  },
  {
    id: "what-it-does",
    question: "What it actually does",
    content: (
      <div className="space-y-3">
        <p>At its core, SnapTagTrack does three things really well:</p>
        <div className="space-y-3 pl-0 sm:pl-1">
          <div>
            <p className="font-semibold text-slate-100">Capture</p>
            <p className="mt-1">
              You take a photo of a receipt, invoice, or anything you&apos;ve bought.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-100">Organise</p>
            <p className="mt-1">
              You tag it your way. Categories, notes, context, whatever matters to you.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-100">Track</p>
            <p className="mt-1">
              Everything becomes searchable and structured, so you can find it later without digging
              through emails, drawers, or WhatsApp threads.
            </p>
          </div>
        </div>
        <p>
          Over time, it builds a complete picture of your spending and purchases without you having to
          think about it.
        </p>
      </div>
    ),
  },
  {
    id: "how-it-works",
    question: "How it works (without the fluff)",
    content: (
      <div className="space-y-3">
        <p className="font-medium text-slate-100">You snap → the system reads → you tag → it stores → you find it later.</p>
        <p className="font-medium text-slate-100">Behind the scenes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>It extracts key info from your receipt (date, vendor, amount).</li>
          <li>
            It lets you organise things in a way that actually makes sense to you.
          </li>
          <li>It keeps everything accessible in one place, across devices.</li>
        </ul>
        <p>No spreadsheets. No admin headache.</p>
      </div>
    ),
  },
  {
    id: "what-to-expect",
    question: "What to expect",
    content: (
      <div className="space-y-3">
        <p>This is where most people get it wrong, so let&apos;s be clear.</p>
        <div className="space-y-3">
          <p>
            <span className="font-semibold text-slate-100">It&apos;s not magic.</span> It gets better with
            use. The more receipts you add and tag, the smarter and more useful it becomes.
          </p>
          <p>
            <span className="font-semibold text-slate-100">You&apos;re still in control.</span> You can
            edit, adjust, and categorise things however you want. It&apos;s not forcing rigid accounting
            rules on you.
          </p>
          <p>
            <span className="font-semibold text-slate-100">It&apos;s built for real life, not perfect inputs.</span>{" "}
            Receipts are messy. Lighting is bad. Paper is crumpled. That&apos;s normal.
          </p>
          <p>
            <span className="font-semibold text-slate-100">It replaces effort, not thinking.</span>{" "}
            You&apos;ll spend seconds capturing something instead of minutes trying to reconstruct it later.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "what-people-use-it-for",
    question: "What people actually use it for",
    content: (
      <div className="space-y-2">
        <ul className="list-disc space-y-2 pl-5">
          <li>Tracking day-to-day spending without spreadsheets</li>
          <li>Keeping receipts for tax or business expenses</li>
          <li>Storing warranties so you don&apos;t lose them</li>
          <li>Remembering what you bought, where, and when</li>
          <li>Getting control over random, fragmented purchases</li>
        </ul>
      </div>
    ),
  },
  {
    id: "what-its-not",
    question: "What it's not",
    content: (
      <div className="space-y-3">
        <p>Let&apos;s not oversell it:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>It&apos;s not full accounting software.</li>
          <li>It&apos;s not trying to replace your accountant.</li>
          <li>It&apos;s not perfect on bad scans or unreadable receipts.</li>
        </ul>
        <p>It&apos;s a practical tool to keep your financial life organised without friction.</p>
      </div>
    ),
  },
  {
    id: "pricing",
    question: "How much does SnapTagTrack cost?",
    content: (
      <p>
        Till further notice the application is totally free to use. Limited to 35 receipt scans per year.
      </p>
    ),
  },
];

type Persona = "household" | "contractor";

const personaLabel: Record<Persona, string> = {
  household: "Household",
  contractor: "Contractor",
};

/** Good/bad scan examples: B = household, A = contractor (see /public/help). */
const scanExamplesByPersona: Record<
  Persona,
  { badSrc: string; goodSrc: string; altBad: string; altGood: string }
> = {
  household: {
    badSrc: "/help/scan-household-bad.png",
    goodSrc: "/help/scan-household-good.png",
    altBad: "Crumpled store receipt — shadows and folds make text hard to read",
    altGood: "Same style of receipt, laid flat — full slip visible and readable",
  },
  contractor: {
    badSrc: "/help/scan-contractor-bad.png",
    goodSrc: "/help/scan-contractor-good.png",
    altBad: "Crumpled invoice with harsh shadows — details are unclear",
    altGood: "Invoice photographed flat — whole page evenly lit and sharp",
  },
};

const stepCards = [
  {
    key: "flat",
    title: "Lay it flat",
    hint: "No folds or curls",
    Icon: Layers,
    iconWrap: "from-sky-500/25 to-blue-600/15 text-sky-300 border border-slate-600/80",
  },
  {
    key: "frame",
    title: "Keep it in frame",
    hint: "All edges visible",
    Icon: RectangleHorizontal,
    iconWrap: "from-violet-500/25 to-indigo-600/15 text-violet-300 border border-slate-600/80",
  },
  {
    key: "light",
    title: "Use good lighting",
    hint: "Bright and even",
    Icon: SunMedium,
    iconWrap: "from-amber-400/30 to-orange-500/20 text-amber-200 border border-slate-600/80",
  },
] as const;

export default function Help() {
  const [persona, setPersona] = useState<Persona>("household");
  const { user } = useAuth();
  const scans = scanExamplesByPersona[persona];

  const navBtn =
    "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold px-4 py-2 text-sm md:text-base transition-colors";

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pt-8 md:pt-12 pb-10">
        {!user && (
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="shrink-0 rounded-lg outline-offset-4 focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50">
              <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-9 md:h-[50px] w-auto brightness-110" />
            </Link>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <span
                className="inline-flex items-center justify-center rounded-xl border border-[#7CB87E]/50 bg-[#7CB87E]/15 px-4 py-2 text-sm font-semibold text-[#7CB87E] md:text-base"
                aria-current="page"
              >
                Help
              </span>
              <Link to="/contact" className={navBtn}>
                Contact
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold text-white md:text-base transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        )}

        <header className="border-b border-slate-600/80 pb-10 sm:pb-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
              <div className="text-center lg:text-left lg:justify-self-start">
                <p className="mb-3 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E] lg:mx-0">
                  Tips &amp; guides
                </p>
                <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Help
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0 lg:max-w-md">
                  Everything you need to get started and get clear scans: answers to common questions, how the
                  app fits together, and photo examples.
                </p>
              </div>

              <div className="min-w-0">
                <figure className="m-0 overflow-hidden rounded-2xl border border-slate-600 bg-slate-900/80 p-3 shadow-xl shadow-black/20 sm:p-4">
                  <figcaption
                    id="help-promo-heading"
                    className="mb-2 text-center text-xs font-semibold tracking-tight text-slate-200 sm:text-sm lg:text-right"
                  >
                    Scan, tag, and file — all in your browser
                  </figcaption>
                  <img
                    src="/help/capture-organise-track-promo.png"
                    alt="SnapTagTrack: use your phone camera to scan any receipt or invoice, see spending summary with tags in the app, then file under jobs or categories such as fuel or admin. Works in the browser with no download."
                    className="mx-auto w-full max-h-[min(55vh,480px)] rounded-lg object-contain object-center lg:max-h-none lg:max-w-full"
                    loading="eager"
                    decoding="async"
                  />
                </figure>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section
          className="mb-10 rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20 sm:p-6"
          aria-labelledby="faq-heading"
        >
          <div className="mb-4 flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-[#7CB87E]" aria-hidden />
            <h2 id="faq-heading" className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              Frequently asked questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {HELP_FAQ_SECTIONS.map(({ id, question, content }) => (
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

        <div
          className="mt-10 space-y-10 rounded-2xl border-2 border-dashed border-[#7CB87E]/50 bg-slate-900/25 p-4 sm:p-5 lg:p-6 shadow-[inset_0_0_0_1px_rgba(124,184,126,0.12)]"
          aria-labelledby="help-scan-guide-title"
        >
          <h2
            id="help-scan-guide-title"
            className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#7CB87E] sm:-mt-1 sm:text-left"
          >
            Scanning guide
          </h2>

        {/* Primary: Bad → Good */}
        <section
          aria-labelledby="scan-compare-heading"
          className="relative overflow-hidden rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20 sm:p-8 lg:p-10"
        >
          <div className="mx-auto mb-8 max-w-lg text-center sm:mb-10">
            <h3
              id="scan-compare-heading"
              className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
            >
              Get Perfect Receipt Scans
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400 sm:text-[15px]">
              Clear photos mean accurate expense tracking, tiny changes to how you snap make a big difference.
            </p>
            <div
              className="mx-auto mt-8 w-full max-w-sm"
              role="group"
              aria-label="Example receipt type"
            >
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-600 bg-slate-800/80 p-1.5">
                {(["household", "contractor"] as const).map((key) => {
                  const active = persona === key;
                  const Icon = key === "household" ? Home : Building2;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPersona(key)}
                      className={cn(
                        "flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-700",
                        active
                          ? "bg-slate-600 text-white shadow-sm ring-1 ring-slate-500"
                          : "text-slate-400 hover:bg-slate-700/80 hover:text-slate-200",
                      )}
                      aria-pressed={active}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      {personaLabel[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-6">
            {/* Bad */}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border-4 border-red-300/85 bg-red-950/25 shadow-lg ring-4 ring-red-200/65",
                  "transition-[box-shadow,border-color] duration-300",
                )}
              >
                <span className="absolute left-4 top-4 z-20 rounded-full bg-black/70 px-3.5 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                  Bad scan
                </span>
                <div className="relative flex min-h-[min(52vh,320px)] w-full items-center justify-center overflow-hidden bg-slate-950/50 sm:min-h-[min(52vh,360px)] lg:min-h-[380px]">
                  <img
                    key={`bad-${persona}-${scans.badSrc}`}
                    src={scans.badSrc}
                    alt={scans.altBad}
                    className="max-h-[min(52vh,480px)] w-full object-contain"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            </div>

            {/* Transformation connector */}
            <div
              className="flex shrink-0 flex-row items-center justify-center gap-2 lg:flex-col lg:py-16"
              aria-hidden
            >
              <span className="hidden text-xs font-semibold uppercase tracking-wider text-[#7CB87E] lg:inline">
                Fix it
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[#7CB87E] shadow-inner lg:h-12 lg:w-12">
                <ArrowDown className="h-5 w-5 lg:hidden" strokeWidth={2.5} />
                <ArrowRight className="hidden h-6 w-6 lg:inline" strokeWidth={2.5} />
              </div>
              <span className="hidden text-[11px] font-medium text-slate-500 lg:inline">
                Aim for this ↓
              </span>
              <span className="text-xs font-medium text-slate-400 lg:hidden">Your goal below</span>
            </div>

            {/* Good */}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border-4 border-emerald-400/85 bg-emerald-50/40 shadow-xl ring-4 ring-emerald-100/95",
                  "transition-[box-shadow,border-color] duration-300",
                )}
              >
                <span className="absolute left-4 top-4 z-20 rounded-full bg-emerald-800/90 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm backdrop-blur-sm">
                  Good scan
                </span>
                <div className="relative flex min-h-[min(52vh,320px)] w-full items-center justify-center overflow-hidden bg-emerald-950/5 sm:min-h-[min(52vh,360px)] lg:min-h-[380px]">
                  <img
                    key={`good-${persona}-${scans.goodSrc}`}
                    src={scans.goodSrc}
                    alt={scans.altGood}
                    className="max-h-[min(52vh,480px)] w-full object-contain"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-lg text-center text-base font-medium text-slate-200 sm:text-lg">
            Clear photos = faster, more accurate tracking
          </p>
        </section>

        {/* Steps — short, onboarding */}
        <section aria-labelledby="steps-heading" className="sm:pt-0">
          <h3 id="steps-heading" className="sr-only">
            Quick steps
          </h3>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {stepCards.map(({ key, title, hint, Icon, iconWrap }) => (
              <div
                key={key}
                className={cn(
                  "group flex flex-col rounded-2xl border border-slate-600 bg-slate-800/60 px-4 py-5 shadow-lg shadow-black/15",
                  "transition duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-xl",
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                )}
              >
                <div
                  className={cn(
                    "mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br",
                    iconWrap,
                    "transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100",
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-base font-semibold text-slate-100">{title}</p>
                <p className="mt-1 text-sm text-slate-400">{hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Light tips */}
        <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="flex gap-4 rounded-2xl border border-slate-600 bg-slate-800/60 p-5 shadow-lg shadow-black/15">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-600 text-[#7CB87E]",
                "transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100",
              )}
            >
              <ScrollText className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-slate-100">Long thermal rolls</p>
              <p className="mt-1 text-sm text-slate-400">
                Lay them flat — keep lines level in the shot.
              </p>
            </div>
          </div>
          <div className="flex gap-4 rounded-2xl border border-slate-600 bg-slate-800/60 p-5 shadow-lg shadow-black/15">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-600 text-sky-400",
                "transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100",
              )}
            >
              <FileStack className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-slate-100">Printed invoices</p>
              <p className="mt-1 text-sm text-slate-400">
                Fit the whole page — phone parallel to the paper.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-600 bg-slate-800/60 px-5 py-5 sm:px-6 sm:py-6 shadow-lg shadow-black/15">
          <p className="text-sm font-medium text-slate-100">Handwritten notes</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Printed text works best. For handwriting, add details yourself so nothing gets missed.
          </p>
        </section>
        </div>

        <section className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-600 bg-slate-700/70 px-6 py-8 text-center shadow-xl shadow-black/20 sm:py-10">
          <p className="text-sm font-semibold text-slate-200">Questions the guide doesn&apos;t cover?</p>
          <Button
            size="lg"
            className="min-h-[48px] w-full max-w-sm shrink-0 gap-2 rounded-xl border-0 bg-orange-500 font-bold text-white shadow-lg shadow-orange-500/25 transition-[box-shadow,transform] hover:bg-orange-600 hover:text-white hover:shadow-orange-500/35 active:scale-[0.98]"
            asChild
          >
            <Link to="/contact">
              <Mail className="h-4 w-4" aria-hidden />
              Need more help?
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
