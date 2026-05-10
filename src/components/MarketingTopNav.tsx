import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Help Centre pill — shared with footer-only pattern elsewhere */
export const marketingNavBtnClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 sm:px-5 md:text-base";

export const marketingLoginBtnClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600 sm:px-5 md:text-base";

const marketingActivePillClass =
  "inline-flex items-center justify-center rounded-xl border border-[#7CB87E]/50 bg-[#7CB87E]/15 px-4 py-2 text-sm font-semibold text-[#7CB87E] sm:px-5 md:text-base";

const mobileMenuItemClass =
  "flex w-full items-center rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800";

const mobileMenuActiveClass = "bg-[#7CB87E]/15 text-[#7CB87E] ring-1 ring-[#7CB87E]/40";

export type MarketingTopNavActive = "help" | "contact" | null;

/**
 * Thin chrome: logo, Help Centre, Contact, Sign in.
 * On viewports below `md`, links collapse behind a hamburger menu.
 */
export default function MarketingTopNav({
  active = null,
  className = "",
}: {
  active?: MarketingTopNavActive;
  className?: string;
}) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className={cn("relative z-30 mb-8", className)}>
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="shrink-0 rounded-lg outline-offset-4 focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50"
          onClick={() => setMenuOpen(false)}
        >
          <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-9 w-auto brightness-110 md:h-[50px]" />
        </Link>

        <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:flex">
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

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 p-2.5 text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50"
            aria-expanded={menuOpen}
            aria-controls="marketing-topnav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-6 w-6 shrink-0" aria-hidden /> : <Menu className="h-6 w-6 shrink-0" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="marketing-topnav-menu"
          className="absolute inset-x-0 top-full z-50 mt-2 rounded-xl border border-slate-600 bg-slate-900/98 p-2 shadow-xl backdrop-blur-sm md:hidden"
          aria-label="Marketing"
        >
          {active === "help" ? (
            <span className={cn(mobileMenuItemClass, mobileMenuActiveClass)} aria-current="page">
              Help Centre
            </span>
          ) : (
            <Link to="/help" className={mobileMenuItemClass} onClick={() => setMenuOpen(false)}>
              Help Centre
            </Link>
          )}
          {active === "contact" ? (
            <span className={cn(mobileMenuItemClass, mobileMenuActiveClass)} aria-current="page">
              Contact
            </span>
          ) : (
            <Link to="/contact" className={mobileMenuItemClass} onClick={() => setMenuOpen(false)}>
              Contact
            </Link>
          )}
          <Link
            to="/auth"
            className={cn(mobileMenuItemClass, "mt-1 border-t border-slate-700 pt-3 text-white")}
            onClick={() => setMenuOpen(false)}
          >
            Sign in
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

/** Horizontal gutters aligned with dashboard shell */
export const marketingPageGutterClass = "mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 md:pt-12 lg:px-10";
