import { Link } from "react-router-dom";

export type SiteFooterVariant = "slate" | "classic" | "landing";

const linkClassLanding =
  "text-[11px] font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]";

/** Fixed marketing footer: Terms and Privacy. Blog is not linked here. */
export default function SiteFooter({ variant }: { variant: SiteFooterVariant }) {
  if (variant === "landing") {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-500 bg-slate-900/95 px-4 py-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <p className="text-center text-xs text-slate-300">Copyright (c) SnapTagTrack</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-3">
            <Link to="/terms" className={linkClassLanding}>
              Terms
            </Link>
            <Link to="/privacy" className={linkClassLanding}>
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    );
  }

  if (variant === "classic") {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-300 bg-white/95 px-4 py-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <p className="text-center text-xs text-gray-600">Copyright (c) SnapTagTrack</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-3">
            <Link to="/terms" className="text-[11px] font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
              Terms
            </Link>
            <Link to="/privacy" className="text-[11px] font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    );
  }

  const slateFooterLink =
    "text-[11px] font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-500 bg-slate-900/95 px-4 py-2 backdrop-blur-sm">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-y-1.5 py-1 sm:py-0">
        <div className="relative flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <p className="text-[11px] text-slate-400 md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2">Beta v0.9.977</p>
          <p className="text-center text-xs text-slate-300">&copy; 2025–2026 Snap Tag Track</p>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-3 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2"
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
