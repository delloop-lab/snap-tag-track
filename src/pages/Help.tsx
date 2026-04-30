import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Home,
  Layers,
  Mail,
  RectangleHorizontal,
  ScrollText,
  SunMedium,
  FileStack,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    iconWrap: "from-sky-500/15 to-blue-600/10 text-sky-700",
  },
  {
    key: "frame",
    title: "Keep it in frame",
    hint: "All edges visible",
    Icon: RectangleHorizontal,
    iconWrap: "from-violet-500/15 to-indigo-600/10 text-violet-700",
  },
  {
    key: "light",
    title: "Use good lighting",
    hint: "Bright and even",
    Icon: SunMedium,
    iconWrap: "from-amber-400/20 to-orange-500/15 text-amber-800",
  },
] as const;

export default function Help() {
  const [persona, setPersona] = useState<Persona>("household");
  const { user } = useAuth();
  const scans = scanExamplesByPersona[persona];

  const supportMailtoHref = useMemo(() => {
    const subject = encodeURIComponent("Snap Tag Track Support");
    const fn =
      typeof user?.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name.trim()
        : "";
    const body = fn
      ? encodeURIComponent(`Hi, my name is ${fn} and I need help with `)
      : encodeURIComponent("I need help with ");
    return `mailto:help@snaptagtrack.com?subject=${subject}&body=${body}`;
  }, [user]);

  return (
    <div className="min-h-full bg-zinc-50 pb-14">
      {/* Compact hero — onboarding, not docs */}
      <header className="border-b border-zinc-100 bg-white px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
        <div className="mx-auto max-w-lg text-center sm:max-w-xl">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Get perfect receipt scans every time
          </h1>
          <p className="mx-auto mt-3 text-pretty text-base text-zinc-600 sm:text-lg">
            Clear photos mean accurate expense tracking. Follow these simple steps.
          </p>

          <div
            className="mx-auto mt-8 w-full max-w-sm"
            role="group"
            aria-label="Example type"
          >
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-zinc-100/90 p-1.5">
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
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
                      active
                        ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                        : "text-zinc-500 active:bg-white/60",
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
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:max-w-5xl lg:px-8">
        {/* Primary: Bad → Good */}
        <section
          aria-labelledby="scan-compare-heading"
          className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] sm:rounded-[2rem] sm:p-8 lg:p-10"
        >
          <div className="mb-8 text-center sm:mb-10">
            <h2
              id="scan-compare-heading"
              className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl lg:text-[1.75rem]"
            >
              Before → after
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 sm:text-[15px]">
              Tiny changes to how you snap make a big difference.
            </p>
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
                <div className="relative flex min-h-[min(52vh,320px)] w-full items-center justify-center overflow-hidden bg-zinc-900/20 sm:min-h-[min(52vh,360px)] lg:min-h-[380px]">
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
              <span className="hidden text-xs font-semibold uppercase tracking-wider text-emerald-700/90 lg:inline">
                Fix it
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-inner lg:h-12 lg:w-12">
                <ArrowDown className="h-5 w-5 lg:hidden" strokeWidth={2.5} />
                <ArrowRight className="hidden h-6 w-6 lg:inline" strokeWidth={2.5} />
              </div>
              <span className="hidden text-[11px] font-medium text-zinc-400 lg:inline">
                Aim for this ↓
              </span>
              <span className="text-xs font-medium text-zinc-500 lg:hidden">Your goal below</span>
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

          <p className="mx-auto mt-10 max-w-lg text-center text-base font-medium text-zinc-700 sm:text-lg">
            Clear photos = faster, more accurate tracking
          </p>
        </section>

        {/* Steps — short, onboarding */}
        <section aria-labelledby="steps-heading" className="mt-10 sm:mt-12">
          <h3 id="steps-heading" className="sr-only">
            Quick steps
          </h3>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {stepCards.map(({ key, title, hint, Icon, iconWrap }) => (
              <div
                key={key}
                className={cn(
                  "group flex flex-col rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm",
                  "transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md",
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
                <p className="text-base font-semibold text-zinc-900">{title}</p>
                <p className="mt-1 text-sm text-zinc-500">{hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Light tips */}
        <section className="mt-10 grid gap-3 sm:mt-11 sm:grid-cols-2 sm:gap-4">
          <div className="flex gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-600/10 text-teal-800",
                "transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100",
              )}
            >
              <ScrollText className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-zinc-900">Long thermal rolls</p>
              <p className="mt-1 text-sm text-zinc-600">
                Lay them flat — keep lines level in the shot.
              </p>
            </div>
          </div>
          <div className="flex gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500/12 to-zinc-600/10 text-slate-800",
                "transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100",
              )}
            >
              <FileStack className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-zinc-900">Printed invoices</p>
              <p className="mt-1 text-sm text-zinc-600">
                Fit the whole page — phone parallel to the paper.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-sm font-medium text-slate-900">Handwritten notes</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Printed text works best. For handwriting, add details yourself so nothing gets missed.
          </p>
        </section>

        <section className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-50 via-orange-50/70 to-sky-50 px-6 py-8 text-center shadow-[0_4px_24px_-8px_rgba(249,115,22,0.2)] ring-1 ring-orange-100/80 sm:py-10">
          <p className="text-sm font-semibold text-orange-950/90">Questions the guide doesn&apos;t cover?</p>
          <Button
            size="lg"
            className="min-h-[48px] w-full max-w-sm shrink-0 gap-2 border-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25 transition-[box-shadow,transform] hover:from-orange-600 hover:to-orange-700 hover:text-white hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98]"
            asChild
          >
            <a href={supportMailtoHref}>
              <Mail className="h-4 w-4" aria-hidden />
              Need more help?
            </a>
          </Button>
        </section>
      </main>
    </div>
  );
}
