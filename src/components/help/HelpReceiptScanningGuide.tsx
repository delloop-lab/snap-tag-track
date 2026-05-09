import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Home,
  Layers,
  RectangleHorizontal,
  ScrollText,
  SunMedium,
  FileStack,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Persona = "household" | "business";

const personaLabel: Record<Persona, string> = {
  household: "Household",
  business: "Business",
};

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
  business: {
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

/** Bad vs good examples and capture habits — used on Help and on /receipt-scanner-app. */
export default function HelpReceiptScanningGuide() {
  const [persona, setPersona] = useState<Persona>("household");
  const scans = scanExamplesByPersona[persona];

  return (
    <div
      className="space-y-10 rounded-2xl border-2 border-dashed border-[#7CB87E]/50 bg-slate-900/25 p-4 sm:p-5 lg:p-6 shadow-[inset_0_0_0_1px_rgba(124,184,126,0.12)]"
      aria-labelledby="help-scan-guide-title"
    >
      <h3
        id="help-scan-guide-title"
        className="mb-1 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#7CB87E] sm:text-left"
      >
        Visual scanning guide
      </h3>
      <p className="mb-4 text-center text-sm text-slate-400 sm:text-left">
        Compare a weak capture with a strong one, then use the three habits below every time you snap.
      </p>

      <section
        aria-labelledby="scan-compare-heading"
        className="relative overflow-hidden rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20 sm:p-8 lg:p-10"
      >
        <div className="mx-auto mb-8 max-w-lg text-center sm:mb-10">
          <h4
            id="scan-compare-heading"
            className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
          >
            Get perfect receipt scans
          </h4>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400 sm:text-[15px]">
            Clear photos mean accurate expense tracking; tiny changes to how you snap make a big difference.
          </p>
          <div className="mx-auto mt-8 w-full max-w-sm" role="group" aria-label="Example receipt type">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-600 bg-slate-800/80 p-1.5">
              {(["household", "business"] as const).map((key) => {
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
            <span className="hidden text-[11px] font-medium text-slate-500 lg:inline">Aim for this ↓</span>
            <span className="text-xs font-medium text-slate-400 lg:hidden">Your goal below</span>
          </div>

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

      <section aria-labelledby="steps-heading" className="sm:pt-0">
        <h4 id="steps-heading" className="sr-only">
          Quick capture habits
        </h4>
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

      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex gap-4 rounded-2xl border border-slate-600 bg-slate-800/60 p-5 shadow-lg shadow-black/15">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/80 text-[#7CB87E]",
              "transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100",
            )}
          >
            <ScrollText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-slate-100">Long thermal rolls</p>
            <p className="mt-1 text-sm text-slate-400">Lay them flat — keep lines level in the shot.</p>
          </div>
        </div>
        <div className="flex gap-4 rounded-2xl border border-slate-600 bg-slate-800/60 p-5 shadow-lg shadow-black/15">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/80 text-sky-400",
              "transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100",
            )}
          >
            <FileStack className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-slate-100">Printed invoices</p>
            <p className="mt-1 text-sm text-slate-400">Fit the whole page — phone parallel to the paper.</p>
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
  );
}
