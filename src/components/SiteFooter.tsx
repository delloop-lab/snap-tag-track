import { Link } from "react-router-dom";

export type SiteFooterVariant = "slate" | "classic";

/** Fixed marketing footer: beta, copyright, Terms & Privacy. Used on landing, Help, Contact, and Login only. */
export default function SiteFooter({ variant }: { variant: SiteFooterVariant }) {
  if (variant === "classic") {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-300 bg-white/95 px-4 py-2 backdrop-blur-sm">
        <div className="relative mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <p className="text-[11px] text-gray-500 md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2">Beta v0.9.967</p>
          <p className="text-center text-xs text-gray-600">&copy; 2025–2026 Snap Tag Track</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
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
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-500 bg-slate-900/95 px-4 py-2 backdrop-blur-sm">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-y-1.5 py-1 sm:py-0">
        <nav
          aria-label="Product guides"
          className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-300 sm:text-xs"
        >
          <Link to="/receipt-scanner-app" className="hover:text-[#7CB87E] hover:underline">
            Receipt scanner
          </Link>
          <span className="text-slate-600" aria-hidden>
            ·
          </span>
          <Link to="/warranty-tracker" className="hover:text-[#7CB87E] hover:underline">
            Warranty tracker
          </Link>
          <span className="text-slate-600" aria-hidden>
            ·
          </span>
          <Link to="/expense-tracking-without-bank" className="hover:text-[#7CB87E] hover:underline">
            Expense tracking
          </Link>
          <span className="text-slate-600" aria-hidden>
            ·
          </span>
          <Link to="/blog" className="hover:text-[#7CB87E] hover:underline">
            Blog
          </Link>
          <span className="text-slate-600" aria-hidden>
            ·
          </span>
          <Link to="/use-cases" className="hover:text-[#7CB87E] hover:underline">
            All guides
          </Link>
        </nav>
        <div className="relative flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <p className="text-[11px] text-slate-400 md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2">Beta v0.9.967</p>
        <p className="text-center text-xs text-slate-300">&copy; 2025–2026 Snap Tag Track</p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
          <Link
            to="/terms"
            className="text-[11px] font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]"
          >
            Terms
          </Link>
          <Link
            to="/privacy"
            className="text-[11px] font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]"
          >
            Privacy
          </Link>
        </div>
        </div>
      </div>
    </footer>
  );
}
