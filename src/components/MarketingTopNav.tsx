import { Link } from "react-router-dom";

/** Shared pill + login styles for slate marketing pages (Help, Contact, Terms, Privacy, Landing). */
export const marketingNavBtnClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold px-4 py-2 text-sm md:text-base transition-colors";

export const marketingLoginBtnClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold text-white md:text-base transition-colors";

const marketingActivePillClass =
  "inline-flex items-center justify-center rounded-xl border border-[#7CB87E]/50 bg-[#7CB87E]/15 px-4 py-2 text-sm font-semibold text-[#7CB87E] md:text-base";

export type MarketingTopNavActive = "help" | "contact" | "auth" | null;

/** Logo + Help / Contact / Login — aligned across Help, Contact, Terms, Privacy, Landing, Auth. */
export default function MarketingTopNav({
  active = null,
  className = "",
}: {
  active?: MarketingTopNavActive;
  className?: string;
}) {
  return (
    <div className={`mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${className}`.trim()}>
      <Link
        to="/"
        className="shrink-0 rounded-lg outline-offset-4 focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50"
      >
        <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-9 md:h-[50px] w-auto brightness-110" />
      </Link>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {active === "help" ? (
          <span className={marketingActivePillClass} aria-current="page">
            Help
          </span>
        ) : (
          <Link to="/help" className={marketingNavBtnClass}>
            Help
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
        {active === "auth" ? (
          <span className={marketingActivePillClass} aria-current="page">
            Login
          </span>
        ) : (
          <Link to="/auth" className={marketingLoginBtnClass}>
            Login
          </Link>
        )}
      </div>
    </div>
  );
}

/** Horizontal gutters aligned with dashboard shell */
export const marketingPageGutterClass = "mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 md:pt-12 lg:px-10";
