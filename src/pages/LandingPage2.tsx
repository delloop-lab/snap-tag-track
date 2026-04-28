import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type Persona = "personal" | "contractor";

const QR_IMAGE = "/home/_assets/media/8d0db40693fba92d239ee56243f720ee.png";

const classicLayout = (
  <main className="flex min-h-screen justify-center items-center p-3 sm:p-4 md:p-8 relative bg-white">
    <div className="flex flex-col md:flex-row w-full max-w-screen-md mx-auto md:max-w-[1100px] bg-white rounded-none md:rounded-[24px] shadow-none md:shadow-[0_8px_32px_rgba(44,62,80,0.10)] overflow-hidden">
      <section className="flex-[0_0_100%] md:flex-[0_0_40%] w-full max-w-full md:max-w-[440px] p-3 sm:p-4 md:p-[2.2rem_2rem_0_2vw] min-w-0 md:min-w-[300px] z-[5]">
        <div className="flex flex-col justify-center h-full min-h-[450px] md:min-h-[650px]">
          <div className="mb-6 md:mb-12">
            <img
              src="/home/_assets/media/f0e22dab0a9645220a4eb65c48b50b4c.png"
              alt="SnapTagTrack Logo"
              className="h-[40px] md:h-[60px] mt-2 md:mt-5"
            />
          </div>
          <h1 className="text-[2rem] md:text-[2.8rem] font-extrabold text-[#666] mt-2 md:mt-5 mb-6 md:mb-11 leading-[1.1] tracking-[-1px] pt-[10px] md:pt-[20px]">
            Turn every receipt into a searchable, trackable, organised record.
          </h1>
          <Link
            to="/auth"
            className="inline-block bg-[#80ba82] text-white px-8 md:px-11 py-3 md:py-4 rounded-[30px] text-base md:text-[1.15rem] font-bold mb-4 cursor-pointer transition-colors hover:bg-[#6da56f] text-center w-full"
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
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialVersion = params.get("v") === "classic" ? "classic" : "new";
  const [version, setVersion] = useState<"classic" | "new">(initialVersion);
  const [persona, setPersona] = useState<Persona>("personal");

  const personaCopy = useMemo(
    () =>
      persona === "personal"
        ? {
            title: "Family-first tracking",
            text: "Track grocery inflation, spot budget leaks, and keep household proof in one place.",
          }
        : {
            title: "Contractor-ready evidence",
            text: "Tag by job/client, capture product photos, and keep clean visual proof for claims and tax time.",
          },
    [persona]
  );

  const setVariant = (next: "classic" | "new") => {
    setVersion(next);
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("v", next);
    navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
  };

  if (version === "classic") {
    return (
      <div>
        {classicLayout}
        <footer className="fixed bottom-3 right-3 z-50">
          <select
            className="text-xs border rounded bg-white px-2 py-1 shadow"
            value={version}
            onChange={(e) => setVariant(e.target.value as "classic" | "new")}
          >
            <option value="classic">Original Classic</option>
            <option value="new">New Modern</option>
          </select>
        </footer>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-800 text-slate-100">
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-14">
        <div className="mb-6 md:mb-8">
          <img
            src="/SnapTagTrack_trans.png"
            alt="Snap Tag Track logo"
            className="h-10 md:h-14 w-auto"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 mb-4">
              Always-Ready Companion
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              The Budget App That&apos;s Always Ready. No Download Required.
            </h1>
            <p className="text-slate-300 mt-4 text-base md:text-lg">
              Snap a photo, tag the project, and track spending instantly. Works even when the internet doesn&apos;t.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3"
              >
                Get Started Now (Free)
              </Link>
              <button
                type="button"
                className="inline-flex md:hidden items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3"
                onClick={() =>
                  alert("Add to Home Screen:\n\niPhone: Share > Add to Home Screen\nAndroid: Menu > Install App")
                }
              >
                Add to Home Screen
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-slate-700/70 border border-slate-600 p-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-orange-500/10 to-transparent" />
              <div className="rounded-xl bg-slate-900/80 border border-slate-600 p-4 min-h-[220px]">
                <div className="h-2 w-16 bg-orange-500 rounded mb-4 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-4/5" />
                  <div className="h-4 bg-slate-700 rounded w-3/5" />
                  <div className="h-4 bg-emerald-500/40 rounded w-2/5" />
                </div>
                <div className="mt-6 h-24 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center">
                  <span className="text-4xl">🧾</span>
                </div>
              </div>
            </motion.div>

            <div className="hidden md:flex flex-col rounded-2xl bg-white text-slate-700 p-4 items-center justify-center">
              <img src={QR_IMAGE} alt="Launch instantly QR code" className="w-36 h-36 mb-2" />
              <p className="text-sm font-semibold">Launch Instantly</p>
              <p className="text-xs text-slate-500 text-center">Scan with your phone to open Snap Tag Track now.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ["Zero Storage", "No 200MB download. Open and go."],
            ["Works Offline", "Snap now. Sync when signal comes back."],
            ["Instant Shortcut", "Add to your home screen in two taps."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-slate-600 bg-slate-700/60 p-4">
              <h3 className="font-bold text-orange-400">{t}</h3>
              <p className="text-slate-300 text-sm mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="inline-flex rounded-xl bg-slate-700 border border-slate-600 p-1 mb-4">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${persona === "personal" ? "bg-emerald-500 text-white" : "text-slate-300"}`}
            onClick={() => setPersona("personal")}
          >
            Personal
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${persona === "contractor" ? "bg-orange-500 text-white" : "text-slate-300"}`}
            onClick={() => setPersona("contractor")}
          >
            Contractor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-600 bg-slate-700/60 p-5 md:col-span-2">
            <h3 className="text-xl font-bold">{personaCopy.title}</h3>
            <p className="text-slate-300 mt-2">{personaCopy.text}</p>
          </div>
          <div className="rounded-2xl border border-slate-600 bg-slate-700/60 p-5">
            <h3 className="font-bold text-emerald-300">Visual Evidence</h3>
            <p className="text-slate-300 mt-2 text-sm">
              Keep receipt and product photos together so families and contractors always have proof ready.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-600 bg-slate-700/60 p-5">
            <h3 className="font-bold">Household</h3>
            <p className="text-slate-300 mt-2 text-sm">Track grocery inflation and find budget leaks quickly.</p>
          </div>
          <div className="rounded-2xl border border-slate-600 bg-slate-700/60 p-5">
            <h3 className="font-bold">Contractor</h3>
            <p className="text-slate-300 mt-2 text-sm">Tag receipts to jobs/clients and keep every deduction visible.</p>
          </div>
          <div className="rounded-2xl border border-slate-600 bg-slate-700/60 p-5">
            <h3 className="font-bold text-orange-300">No App Store Barriers</h3>
            <p className="text-slate-300 mt-2 text-sm">Open by URL or scan the QR code and start immediately.</p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-slate-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left p-3">Feature</th>
                <th className="text-left p-3 text-emerald-300">Snap Tag Track</th>
                <th className="text-left p-3 text-slate-300">Traditional Bank-Linked Apps</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800">
              {[
                ["Privacy", "You choose what you capture", "Requires account/bank connection"],
                ["Speed", "Snap and tag in seconds", "Setup friction before value"],
                ["Offline Use", "Works when signal is weak", "Often needs internet"],
                ["Visual Proof", "Receipt + product photos together", "Mostly transaction text"],
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

      <section className="max-w-6xl mx-auto px-4 py-6 pb-20">
        <h2 className="text-xl font-bold mb-4">Simple Install Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-600 bg-slate-700/60 p-4">
            <h3 className="font-semibold text-emerald-300">iPhone</h3>
            <p className="text-sm text-slate-300 mt-2">Tap Share, then tap Add to Home Screen.</p>
          </div>
          <div className="rounded-xl border border-slate-600 bg-slate-700/60 p-4">
            <h3 className="font-semibold text-orange-300">Android</h3>
            <p className="text-sm text-slate-300 mt-2">Open browser menu, then tap Install App.</p>
          </div>
        </div>
      </section>

      <footer className="fixed bottom-3 right-3 z-50">
        <select
          className="text-xs border border-slate-500 rounded bg-slate-900 text-slate-100 px-2 py-1"
          value={version}
          onChange={(e) => setVariant(e.target.value as "classic" | "new")}
        >
          <option value="classic">Original Classic</option>
          <option value="new">New Modern</option>
        </select>
      </footer>
    </main>
  );
}