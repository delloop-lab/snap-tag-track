import { Link } from "react-router-dom";
import {
  marketingHeaderInnerClass,
  marketingHorizontalShellClass,
} from "@/components/MarketingTopNav";

export type SiteFooterVariant = "slate" | "classic" | "landing";

const linkClassLanding =
  "text-[11px] font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]";

/** Fixed marketing footer: Terms and Privacy. Blog is not linked here. */
export default function SiteFooter({ variant }: { variant: SiteFooterVariant }) {
  if (variant === "landing") {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-500 bg-slate-900/95 backdrop-blur-sm">
        <div
          className={`${marketingHorizontalShellClass} py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
        >
          <div
            className={`${marketingHeaderInnerClass} flex flex-col items-center gap-y-1 md:flex-row md:items-center md:justify-between md:gap-x-6`}
          >
            <p className="shrink-0 text-center text-[11px] font-medium text-slate-300 md:text-left">
              Beta v0.9.978
            </p>
            <p className="min-w-0 flex-1 text-center text-xs text-slate-300 md:px-4">
              Copyright (c) SnapTagTrack
            </p>
            <nav
              aria-label="Footer"
              className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 md:justify-end"
            >
              <Link to="/terms" className={linkClassLanding}>
                Terms
              </Link>
              <Link to="/privacy" className={linkClassLanding}>
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === "classic") {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-300 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6 md:px-8">
          <div className="flex flex-col items-center gap-y-1 md:flex-row md:items-center md:justify-between md:gap-x-6">
            <p className="shrink-0 text-center text-[11px] font-medium text-gray-500 md:text-left">Beta v0.9.978</p>
            <p className="min-w-0 flex-1 text-center text-xs text-gray-600 md:px-4">Copyright (c) SnapTagTrack</p>
            <nav
              aria-label="Footer"
              className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 md:justify-end"
            >
              <Link
                to="/terms"
                className="text-[11px] font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="text-[11px] font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
              >
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    );
  }

  const slateFooterLink =
    "text-[11px] font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-500 bg-slate-900/95 backdrop-blur-sm">
      <div
        className={`${marketingHorizontalShellClass} py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
      >
        <div
          className={`${marketingHeaderInnerClass} flex flex-col items-center gap-y-1 md:flex-row md:items-center md:justify-between md:gap-x-6`}
        >
          <p className="shrink-0 text-center text-[11px] font-medium text-slate-300 md:text-left">Beta v0.9.978</p>
          <p className="min-w-0 flex-1 text-center text-xs text-slate-300 md:px-4">
            &copy; 2025–2026 Snap Tag Track
          </p>
          <nav
            aria-label="Footer"
            className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 md:justify-end"
          >
            <Link to="/terms" className={slateFooterLink}>
              Terms
            </Link>
            <Link to="/privacy" className={slateFooterLink}>
              Privacy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
