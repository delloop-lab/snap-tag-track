import { Link } from "react-router-dom";

/** Help Centre pill — shared with footer-only pattern elsewhere */
export const marketingNavBtnClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 sm:px-5 md:text-base";

export const marketingLoginBtnClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600 sm:px-5 md:text-base";

const marketingActivePillClass =
  "inline-flex items-center justify-center rounded-xl border border-[#7CB87E]/50 bg-[#7CB87E]/15 px-4 py-2 text-sm font-semibold text-[#7CB87E] sm:px-5 md:text-base";

export type MarketingTopNavActive = "help" | "contact" | null;

/**
 * Thin chrome: logo, Help Centre, Contact, Sign in.
 */
export default function MarketingTopNav({
  active = null,
  className = "",
}: {
  active?: MarketingTopNavActive;
  className?: string;
}) {
  return (
    <div className={`mb-8 flex items-center justify-between gap-3 ${className}`.trim()}>
      <Link
        to="/"
        className="shrink-0 rounded-lg outline-offset-4 focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50"
      >
        <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-9 w-auto brightness-110 md:h-[50px]" />
      </Link>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {active === "help" ? (
          <span className={marketingActivePillClass} aria-current="page">
            Help Centre
          </span>
        ) : (
          <Link to="/help" className={marketingNavBtnClass}>
            Help Centre
          </Link>
        )}
        {active === "contact" ? (
          <span className={marketingActivePillClass} aria-current="page">
            Contact
          </span>
        ) : (
          <Link to="/contact" className={marketingNavBtnClass}>
            Contact
          </Link>
        )}
        <Link to="/auth" className={marketingLoginBtnClass}>
          Sign in
        </Link>
      </div>
    </div>
  );
}

/** Horizontal gutters aligned with dashboard shell */
export const marketingPageGutterClass = "mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 md:pt-12 lg:px-10";
