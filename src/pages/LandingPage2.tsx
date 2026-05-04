import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";

type Persona = "personal" | "contractor";

const QR_IMAGE = "/home/_assets/media/8d0db40693fba92d239ee56243f720ee.png";

const classicLayout = (
  <main className="flex min-h-screen justify-center items-center p-3 sm:p-4 md:p-8 relative bg-white pb-24">
    <div className="flex flex-col md:flex-row w-full max-w-screen-md mx-auto md:max-w-[1100px] bg-white rounded-none md:rounded-[24px] shadow-none md:shadow-[0_8px_32px_rgba(44,62,80,0.10)] overflow-hidden">
      <section className="flex-[0_0_100%] md:flex-[0_0_40%] w-full max-w-full md:max-w-[440px] p-3 sm:p-4 md:p-[2.2rem_2rem_0_2vw] min-w-0 md:min-w-[300px] z-[5]">
        <div className="flex flex-col justify-center h-full min-h-[450px] md:min-h-[650px]">
        <div className="mb-6 md:mb-12 flex items-start justify-between gap-4">
          <div>
            <img
              src="/home/_assets/media/f0e22dab0a9645220a4eb65c48b50b4c.png"
              alt="SnapTagTrack Logo"
              className="h-[40px] md:h-[60px] mt-2 md:mt-5"
            />
          </div>
          <div className="flex shrink-0 items-center gap-3 mt-2 md:mt-5">
            <Link
              to="/help"
              className="text-sm font-semibold text-[#666] underline underline-offset-2 hover:text-[#333] whitespace-nowrap"
            >
              Help
            </Link>
            <Link
              to="/contact"
              className="text-sm font-semibold text-[#666] underline underline-offset-2 hover:text-[#333] whitespace-nowrap"
            >
              Contact
            </Link>
          </div>
        </div>
          <h1 className="text-[2rem] md:text-[2.8rem] font-extrabold text-[#666] mt-2 md:mt-5 mb-6 md:mb-11 leading-[1.1] tracking-[-1px] pt-[10px] md:pt-[20px]">
            Turn every receipt into a searchable, trackable, organised record.
          </h1>
          <Link
            to="/auth"
            className="inline-block bg-[#7CB87E] text-white px-8 md:px-11 py-3 md:py-4 rounded-[30px] text-base md:text-[1.15rem] font-bold mb-4 cursor-pointer transition-colors hover:bg-[#7CB87E]/90 text-center w-full"
          >
            GET STARTED IT&apos;S FREE
          </Link>
        </div>
      </section>
      <section className="flex-1 min-w-0 relative min-h-[300px] md:min-h-[700px] overflow-hidden bg-white">
        <div className="relative z-[3] w-full h-full">
          <img
            src="/home/_assets/media/5cdfca5bafd425675a5bfdc47417d87c.png"
            alt="Woman with receipt"
            className="absolute left-0 top-0 w-full h-full object-cover object-right"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute bottom-[5px] left-[2.2rem] right-4 flex justify-end items-center">
            <div className="bg-white p-3 md:p-4 rounded-[22px] shadow-[0_8px_32px_rgba(44,62,80,0.18)] z-[4]">
              <img src={QR_IMAGE} alt="QR Code" className="w-24 h-24 md:w-32 md:h-32 mb-2" />
              <span className="text-xs md:text-sm text-gray-600 block text-center">Phone-friendly</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
);

export default function LandingPage2() {
  const { user } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialVersion = params.get("v") === "classic" ? "classic" : "new";
  const [version, setVersion] = useState<"classic" | "new">(initialVersion);
  const [persona, setPersona] = useState<Persona>("personal");

  const personaCopy = useMemo(
    () =>
      persona === "personal"
        ? {
            title: "Family-first tracking",
            text: "Track purchases so you don't lose money and don't get screwed on warranties.",
          }
        : {
            title: "Contractor-ready evidence",
            text: "Tag by job/client, capture product photos, and keep clean visual proof for claims and tax time.",
          },
    [persona]
  );
  const personaHeroImage =
    persona === "personal" ? "/snaptagtrack_1.jpg" : "/snaptagtrack_2.jpg";

  if (version === "classic") {
    return (
      <div>
        {classicLayout}
        <SiteFooter variant="classic" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-800 text-slate-100 pb-28">
      <section className={`${marketingPageGutterClass} pb-14 md:pb-20`}>
        {!user && <MarketingTopNav />}

        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs text-[#7CB87E] mb-4">
              Always-Ready Companion
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Never lose a warranty again.
            </h1>
            <p className="text-slate-300 mt-4 text-base md:text-lg leading-relaxed">
              Snap receipts or invoices, tag them instantly, and track spending automatically. Get timely reminders before
              warranties expire so you stay in control of what you&apos;ve already paid for.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link to="/auth" className="inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3">
                Get Started it&apos;s Free
              </Link>
              <div className="hidden md:inline-flex rounded-xl bg-slate-700 border border-slate-600 p-1 w-fit">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    persona === "personal" ? "bg-[#7CB87E] text-white" : "text-slate-300"
                  }`}
                  onClick={() => setPersona("personal")}
                >
                  Family
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    persona === "contractor" ? "bg-[#4A8AE6] text-white" : "text-slate-300"
                  }`}
                  onClick={() => setPersona("contractor")}
                >
                  Contractor
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 max-w-[460px] w-full justify-self-end">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-slate-700/70 border border-slate-600 p-4">
              <div className="rounded-xl bg-slate-900/80 border border-slate-600 p-3 min-h-[200px]">
                <div className="h-2 w-16 bg-orange-500 rounded mb-4 animate-pulse" />
                <p className={`text-xs mb-3 ${persona === "personal" ? "text-[#7CB87E]" : "text-[#4A8AE6]"}`}>
                  {persona === "personal" ? "FAMILY" : "WORK"}
                </p>
                <div className="mt-2 h-[250px] md:h-[300px] rounded-lg bg-slate-800 border border-slate-600 overflow-hidden">
                  <img
                    src={personaHeroImage}
                    alt={persona === "personal" ? "SnapTagTrack family preview" : "SnapTagTrack contractor preview"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-bold">Built for Households and Contractors</h2>
          <div className="inline-flex rounded-xl bg-slate-700 border border-slate-600 p-1">
            <button className={`px-4 py-2 rounded-lg text-sm font-semibold ${persona === "personal" ? "bg-[#7CB87E] text-white" : "text-slate-300"}`} onClick={() => setPersona("personal")}>Family</button>
            <button className={`px-4 py-2 rounded-lg text-sm font-semibold ${persona === "contractor" ? "bg-[#4A8AE6] text-white" : "text-slate-300"}`} onClick={() => setPersona("contractor")}>Contractor</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className={`rounded-2xl border bg-slate-700/60 p-6 md:col-span-2 ${persona === "personal" ? "border-[#7CB87E]/40" : "border-[#4A8AE6]/40"}`}>
            <h3 className={`text-xl font-bold ${persona === "personal" ? "text-[#7CB87E]" : "text-[#4A8AE6]"}`}>
              {personaCopy.title}
            </h3>
            <p className="text-slate-300 mt-2 leading-relaxed">{personaCopy.text}</p>
          </div>
          <div className={`rounded-2xl border bg-slate-700/60 p-6 ${persona === "personal" ? "border-[#7CB87E]/35" : "border-[#4A8AE6]/35"}`}>
            <h3 className={`font-bold ${persona === "personal" ? "text-[#7CB87E]" : "text-[#4A8AE6]"}`}>Visual Evidence</h3>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed">Attach receipt and product photos so proof is always ready.</p>
          </div>
          <div className="rounded-2xl border border-[#7CB87E]/35 bg-slate-700/60 p-6">
            <h3 className="font-bold text-[#7CB87E]">Family Focus</h3>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed">
              Keep your family budget under control by tracking rising grocery costs and hidden spending leaks.
            </p>
          </div>
          <div className="rounded-2xl border border-[#4A8AE6]/35 bg-slate-700/60 p-6">
            <h3 className="font-bold text-[#4A8AE6]">Contractor Focus</h3>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed">
              Organise receipts by job or client and make sure every deductible cost is accounted for.
            </p>
          </div>
          <div className={`rounded-2xl border bg-slate-700/60 p-6 ${persona === "personal" ? "border-[#7CB87E]/35" : "border-[#4A8AE6]/35"}`}>
            <h3 className={`font-bold ${persona === "personal" ? "text-[#7CB87E]" : "text-[#4A8AE6]"}`}>Warranty Tracking</h3>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed">
              Every receipt is stored with its warranty and you&apos;re reminded before it expires.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-bold">Your Mode, Your Outcomes</h2>
          <div className="inline-flex rounded-xl bg-slate-700 border border-slate-600 p-1">
            <button className={`px-4 py-2 rounded-lg text-sm font-semibold ${persona === "personal" ? "bg-[#7CB87E] text-white" : "text-slate-300"}`} onClick={() => setPersona("personal")}>Family</button>
            <button className={`px-4 py-2 rounded-lg text-sm font-semibold ${persona === "contractor" ? "bg-[#4A8AE6] text-white" : "text-slate-300"}`} onClick={() => setPersona("contractor")}>Contractor</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-600 bg-slate-700/60 p-6">
            <h3 className={`font-bold text-lg ${persona === "personal" ? "text-[#7CB87E]" : "text-[#4A8AE6]"}`}>
              {persona === "personal" ? "Control household spending" : "Control project spend"}
            </h3>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed">
              {persona === "personal"
                ? "See where money goes each week and stop small leaks before they become big bills."
                : "Know exactly what each job costs and keep all supplier proof ready for client conversations."}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-600 bg-slate-700/60 p-6">
            <h3 className={`font-bold text-lg ${persona === "personal" ? "text-[#7CB87E]" : "text-[#4A8AE6]"}`}>
              {persona === "personal" ? "Never lose warranty proof" : "Never lose expense proof"}
            </h3>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed">
              {persona === "personal"
                ? "Store receipt and product images together for returns, repairs, and support claims."
                : "Keep each receipt and it's image linked to a client/job so tax and reporting season is painless."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 md:pb-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            [
              "Zero Storage",
              persona === "contractor"
                ? "No 200MB download. Open and go instantly from a link or QR."
                : "No need to download another App on your phone.",
            ],
            [
              "Works Offline",
              persona === "contractor"
                ? "Capture now in weak signal areas and sync when you have connection."
                : "Capture now even when the Internet goes down and sync when you have connection.",
            ],
            [
              "Share the information",
              persona === "contractor"
                ? "Whether onsite working, or in the office, everyone can share information."
                : "Whether you do the books or your partner does, you can both share the information.",
            ],
          ].map(([t, d]) => (
            <div
              key={t}
              className={`rounded-2xl border bg-slate-700/60 p-6 ${
                persona === "personal" ? "border-[#7CB87E]/35" : "border-[#4A8AE6]/35"
              }`}
            >
              <h3
                className={`font-bold text-lg ${
                  persona === "personal" ? "text-[#7CB87E]" : "text-[#4A8AE6]"
                }`}
              >
                {t}
              </h3>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Guides and tools</h2>
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
          Read how receipt scanning, warranty reminders, and expense tracking fit together—then{" "}
          <Link to="/auth" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
            try Snap Tag Track free
          </Link>{" "}
          or visit{" "}
          <Link to="/help" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
            Help
          </Link>{" "}
          for product FAQs.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["/receipt-scanner-app", "Receipt scanner app for photos, tags, and records"],
            ["/warranty-tracker", "Warranty tracker for expiry reminders and proof"],
            ["/expense-tracking-without-bank", "Expense tracking without linking your bank"],
            ["/contractor-expense-tracker", "Contractor expense tracker for job receipts"],
            ["/household-spending-tracker", "Household spending tracker from real receipts"],
            ["/fuel-food-spending-tracker", "Fuel and food spending tracker"],
            ["/how-it-works", "How Snap Tag Track works (snap, tag, track)"],
            ["/pricing", "Pricing and free tier limits"],
            ["/use-cases", "Use cases for families and contractors"],
            ["/blog", "Blog index for longer guides"],
          ].map(([href, label]) => (
            <Link
              key={href}
              to={href}
              className="rounded-2xl border border-slate-600 bg-slate-700/50 p-4 text-sm font-semibold text-slate-100 transition-colors hover:border-[#7CB87E]/50 hover:bg-slate-700"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 md:pb-16">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold">Latest Guides</h2>
          <Link to="/blog" className="text-sm font-semibold text-[#7CB87E] hover:underline">
            View all blog posts
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["/blog/how-to-track-receipts-for-taxes", "How to Track Receipts for Taxes (Without Losing Anything)"],
            ["/blog/how-to-track-expenses-without-bank", "How to Track Expenses Without Connecting Your Bank"],
            ["/blog/why-expense-tracking-fails", "Why Expense Tracking Fails for Most People"],
          ].map(([href, label]) => (
            <article key={href} className="rounded-2xl border border-slate-600 bg-slate-700/50 p-5">
              <h3 className="text-base font-bold text-white">
                <Link to={href} className="hover:text-[#7CB87E] hover:underline">
                  {label}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Practical walkthroughs focused on receipts, spending categories, and warranty-proof habits.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-bold mb-5">Snap Tag Track vs Traditional Bank-Linked Apps</h2>
        <div className="rounded-2xl border border-slate-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left p-3">Feature</th>
                <th className="text-left p-3 text-[#7CB87E]">Snap Tag Track</th>
                <th className="text-left p-3 text-slate-300">Traditional Bank-Linked Apps</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800">
              {[
                ["Privacy", "You decide what you capture", "Requires account/bank connection"],
                ["Speed", "Snap and tag immediately", "Setup friction before value"],
                ["Offline Use", "Works in weak/no signal", "Often needs internet"],
                ["Visual Proof", "Receipt + product photos", "Mostly transaction text"],
              ].map(([f, a, b]) => (
                <tr key={f} className="border-t border-slate-700">
                  <td className="p-3 font-semibold">{f}</td>
                  <td className="p-3">{a}</td>
                  <td className="p-3 text-slate-400">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-28">
        <div className="hidden md:flex max-w-sm mx-auto flex-col items-center justify-center rounded-2xl border border-slate-600 bg-slate-700/60 p-6 text-slate-100 shadow-xl shadow-black/20">
          <div className="rounded-xl bg-white p-3 shadow-md">
            <img src={QR_IMAGE} alt="Launch instantly QR code" className="h-36 w-36" />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#7CB87E]">Launch Instantly</p>
          <p className="mt-1 text-center text-xs text-slate-300">
            Scan with your phone to open Snap Tag Track now.
          </p>
        </div>
      </section>

      <SiteFooter variant="slate" />
    </main>
  );
}