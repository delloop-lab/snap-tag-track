import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

/** Shared pill + login styles for slate marketing pages (Help, Contact, Terms, Privacy, Landing). */
export const marketingNavBtnClass =
  "inline-flex min-w-[88px] flex-1 items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 sm:min-w-0 sm:flex-none sm:px-4 md:text-base";

export const marketingLoginBtnClass =
  "inline-flex min-w-[88px] flex-1 items-center justify-center rounded-xl border border-slate-500 bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600 sm:min-w-0 sm:flex-none sm:px-4 md:text-base";

const marketingActivePillClass =
  "inline-flex min-w-[88px] flex-1 items-center justify-center rounded-xl border border-[#7CB87E]/50 bg-[#7CB87E]/15 px-3 py-2 text-sm font-semibold text-[#7CB87E] sm:min-w-0 sm:flex-none sm:px-4 md:text-base";

export type MarketingTopNavActive = "help" | "contact" | "auth" | null;

/** Logo + Help / Contact / Login — aligned across Help, Contact, Terms, Privacy, Landing, Auth. */
export default function MarketingTopNav({
  active = null,
  className = "",
}: {
  active?: MarketingTopNavActive;
  className?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className={`mb-8 ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="shrink-0 rounded-lg outline-offset-4 focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50"
        >
          <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-9 w-auto brightness-110 md:h-[50px]" />
        </Link>

        <div className="flex items-center gap-2 sm:hidden">
          {active === "auth" ? (
            <span className={`${marketingActivePillClass} flex-none`} aria-current="page">
              Login
            </span>
          ) : (
            <Link to="/auth" className={`${marketingLoginBtnClass} flex-none`}>
              Login
            </Link>
          )}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-500 bg-slate-700 text-white transition-colors hover:bg-slate-600"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div className="hidden min-w-0 shrink-0 flex-wrap items-center justify-end gap-3 sm:flex">
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

      {mobileMenuOpen && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-slate-600 bg-slate-800/85 p-2 sm:hidden">
          {active === "help" ? (
            <span className={marketingActivePillClass} aria-current="page">
              Help
            </span>
          ) : (
            <Link to="/help" className={marketingNavBtnClass} onClick={() => setMobileMenuOpen(false)}>
              Help
            </Link>
          )}
          {active === "contact" ? (
            <span className={marketingActivePillClass} aria-current="page">
              Contact
            </span>
          ) : (
            <Link to="/contact" className={marketingNavBtnClass} onClick={() => setMobileMenuOpen(false)}>
              Contact
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontal gutters aligned with dashboard shell */
export const marketingPageGutterClass = "mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 md:pt-12 lg:px-10";
