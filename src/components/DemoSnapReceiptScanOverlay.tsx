import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getClientDemoReceiptImagePath,
  pickRandomDemoReceiptId,
} from "@/lib/demo/clientDemoData";
import { resolveReceiptThumbUrl } from "@/lib/receiptImageUrl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the simulated scan completes with the same demo receipt shown in the animation. */
  onComplete: (receiptId: string) => void;
};

/** Step copy timings (base ms); multiplied by {@link SCAN_SLOWDOWN} at runtime. */
const STEPS: { label: string; ms: number }[] = [
  { label: "Opening camera…", ms: 520 },
  { label: "Scanning receipt…", ms: 720 },
  { label: "Extracting data…", ms: 620 },
];

/** Extra slowdown for step delays and motion (scan beam, sweeps, handheld drift). */
const SCAN_SLOWDOWN = 2.05;

/** After the last scan step, hold before closing and opening receipt details (preview mode). */
const POST_SCAN_NAV_DELAY_MS = 1000;

function scaledDelay(baseMs: number) {
  return Math.round(baseMs * SCAN_SLOWDOWN);
}

function scaledDuration(base: number) {
  return base * SCAN_SLOWDOWN;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Faint receipt line widths (% of paper width) when image is not ready. */
const RECEIPT_LINE_WIDTHS = [72, 88, 65, 92, 58, 84, 70, 95, 62, 78, 55, 90, 68];

function ViewfinderCorners({ active }: { active: boolean }) {
  const corner =
    "pointer-events-none absolute border-emerald-400/85 shadow-[0_0_8px_rgba(52,211,153,0.25)]";
  const len = "h-7 w-7 sm:h-8 sm:w-8";
  const pulse = { opacity: [0.55, 1, 0.55] as const };
  const idle = { opacity: 0.78 };
  const d = scaledDuration(1.8);
  return (
    <>
      <motion.div
        className={`${corner} ${len} left-3 top-3 border-l-2 border-t-2 rounded-tl-sm`}
        animate={active ? pulse : idle}
        transition={{ duration: d, repeat: active ? Infinity : 0, ease: "easeInOut" }}
      />
      <motion.div
        className={`${corner} ${len} right-3 top-3 border-r-2 border-t-2 rounded-tr-sm`}
        animate={active ? pulse : idle}
        transition={{ duration: d, repeat: active ? Infinity : 0, ease: "easeInOut", delay: 0.15 }}
      />
      <motion.div
        className={`${corner} ${len} bottom-3 left-3 border-b-2 border-l-2 rounded-bl-sm`}
        animate={active ? pulse : idle}
        transition={{ duration: d, repeat: active ? Infinity : 0, ease: "easeInOut", delay: 0.3 }}
      />
      <motion.div
        className={`${corner} ${len} bottom-3 right-3 border-b-2 border-r-2 rounded-br-sm`}
        animate={active ? pulse : idle}
        transition={{ duration: d, repeat: active ? Infinity : 0, ease: "easeInOut", delay: 0.45 }}
      />
    </>
  );
}

/**
 * Demo-only full-screen UX: progressive scan messages, no camera/OCR/DB.
 * Picks one demo receipt up front, shows its image during the scan, then opens that receipt.
 */
export function DemoSnapReceiptScanOverlay({ open, onOpenChange, onComplete }: Props) {
  const [message, setMessage] = useState(STEPS[0]!.label);
  const [scanStep, setScanStep] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onOpenChangeRef = useRef(onOpenChange);
  const targetIdRef = useRef<string>("");
  onCompleteRef.current = onComplete;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) {
      setMessage(STEPS[0]!.label);
      setScanStep(0);
      setPreviewImageUrl(null);
      targetIdRef.current = "";
      return;
    }

    const id = pickRandomDemoReceiptId();
    targetIdRef.current = id;
    setPreviewImageUrl(null);

    const path = getClientDemoReceiptImagePath(id);
    let imageCancelled = false;
    void (async () => {
      if (!path) return;
      const url = await resolveReceiptThumbUrl(path);
      if (imageCancelled) return;
      setPreviewImageUrl(url ?? (path.startsWith("/") ? path : null));
    })();

    let cancelled = false;

    void (async () => {
      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return;
        const step = STEPS[i]!;
        setScanStep(i);
        setMessage(step.label);
        await delay(scaledDelay(step.ms));
      }
      if (cancelled) return;
      await delay(POST_SCAN_NAV_DELAY_MS);
      if (cancelled) return;
      onCompleteRef.current(targetIdRef.current);
      onOpenChangeRef.current(false);
    })();

    return () => {
      cancelled = true;
      imageCancelled = true;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  const isCamera = scanStep === 0;
  const isScanning = scanStep === 1;
  const isExtracting = scanStep === 2;
  const scanPeriod = scaledDuration(0.72);
  const extractSweep = scaledDuration(0.62);
  const specularSweep = scaledDuration(0.65);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="demo-snap-overlay"
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: scaledDuration(0.25) }}
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Receipt scan simulation for preview"
        >
          <div className="absolute inset-0 bg-slate-950/88 backdrop-blur-md" />

          <motion.div
            className="relative w-full max-w-md"
            animate={{
              x: isCamera || isScanning ? [0, 0.4, -0.35, 0.25, 0] : 0,
              y: isCamera || isScanning ? [0, -0.25, 0.2, -0.15, 0] : 0,
            }}
            transition={{
              duration: scaledDuration(2.2),
              repeat: isCamera || isScanning ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="relative w-full overflow-hidden rounded-2xl border border-orange-500/30 bg-slate-900/95 p-6 shadow-2xl shadow-black/60 ring-1 ring-white/[0.07] sm:p-8"
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              <p className="mb-5 max-w-[280px] text-center text-[11px] leading-snug text-slate-400 sm:max-w-sm sm:text-xs">
                <span className="font-semibold text-slate-200">Not a real scan.</span> Preview only — no camera
                capture, no upload, and no data sent for processing.
              </p>

              <div className="relative mx-auto mb-6 aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-lg bg-black ring-1 ring-white/12 sm:max-w-[280px]">
                <div className="absolute right-2 top-2 z-[30] flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 ring-1 ring-white/10">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]"
                    animate={{ opacity: [1, 0.35, 1], scale: [1, 0.92, 1] }}
                    transition={{
                      duration: scaledDuration(1.1),
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-200/95">Rec</span>
                </div>

                <div
                  className="pointer-events-none absolute inset-0 z-20 rounded-lg"
                  style={{
                    boxShadow: "inset 0 0 60px 12px rgba(0,0,0,0.55), inset 0 0 120px 40px rgba(0,0,0,0.35)",
                  }}
                />

                <ViewfinderCorners active={isScanning || isExtracting} />

                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />

                <motion.div
                  className="absolute inset-[10%_11%] overflow-hidden rounded-sm shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                  style={{
                    background:
                      "linear-gradient(180deg, #f8f6f2 0%, #ebe6dc 48%, #e2ddd4 100%)",
                  }}
                  animate={{
                    filter: isCamera ? ["blur(5px)", "blur(2px)", "blur(0px)"] : "blur(0px)",
                    scale: isCamera ? [1.04, 1.01, 1] : 1,
                  }}
                  transition={{ duration: scaledDuration(0.85), ease: "easeOut" }}
                >
                  {previewImageUrl ? (
                    <img
                      key={previewImageUrl}
                      src={previewImageUrl}
                      alt=""
                      className="absolute inset-0 z-[1] h-full w-full object-cover object-center"
                      draggable={false}
                    />
                  ) : (
                    <>
                      <div
                        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.14]"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.06)_45%,rgba(0,0,0,0.04)_55%,transparent_100%)]" />
                      <div className="relative z-[2] flex h-full flex-col gap-[5px] px-[8%] pt-[12%] pb-[14%]">
                        <div className="mb-1 h-2 w-[38%] rounded-sm bg-slate-800/35" />
                        {RECEIPT_LINE_WIDTHS.map((w, idx) => (
                          <div
                            key={idx}
                            className="h-[3px] rounded-full bg-slate-800/20"
                            style={{ width: `${w}%` }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {previewImageUrl && (
                    <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/10 via-transparent to-black/25" />
                  )}

                  {isScanning && (
                    <>
                      <motion.div
                        className="pointer-events-none absolute inset-x-0 z-[3] h-[28%] -translate-y-1/2"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 0%, rgba(251,191,60,0.06) 35%, rgba(253,186,116,0.35) 50%, rgba(251,191,60,0.06) 65%, transparent 100%)",
                        }}
                        animate={{ top: ["6%", "94%"] }}
                        transition={{ duration: scanPeriod, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div
                        className="pointer-events-none absolute inset-x-[6%] z-[4] h-[2px] -translate-y-1/2 rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 20%, rgba(251,146,60,1) 50%, rgba(255,255,255,0.95) 80%, transparent 100%)",
                          boxShadow:
                            "0 0 14px rgba(251,146,60,0.9), 0 0 28px rgba(251,146,60,0.45), 0 6px 20px rgba(0,0,0,0.35)",
                        }}
                        animate={{ top: ["6%", "94%"] }}
                        transition={{ duration: scanPeriod, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div
                        className="pointer-events-none absolute inset-x-[10%] z-[2] h-10 -translate-y-1/2 rounded-full bg-orange-400/25 blur-md"
                        animate={{ top: ["6%", "94%"] }}
                        transition={{ duration: scanPeriod, repeat: Infinity, ease: "linear" }}
                      />
                    </>
                  )}

                  {isExtracting && (
                    <motion.div
                      className="pointer-events-none absolute inset-y-0 z-[5] w-[42%] -translate-x-1/2"
                      style={{
                        left: "0%",
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.12) 40%, rgba(125,211,252,0.35) 50%, rgba(56,189,248,0.12) 60%, transparent 100%)",
                        boxShadow: "0 0 24px rgba(56,189,248,0.25)",
                      }}
                      initial={{ left: "-15%" }}
                      animate={{ left: ["-15%", "115%"] }}
                      transition={{ duration: extractSweep, repeat: Infinity, ease: "linear" }}
                    />
                  )}

                  {isExtracting && (
                    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 w-[55%] min-w-[100px] -translate-x-1/2"
                        style={{
                          left: "-30%",
                          background:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.08) 58%, transparent 100%)",
                        }}
                        animate={{ left: ["-30%", "130%"] }}
                        transition={{ duration: specularSweep, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}
                </motion.div>

                <div
                  className="pointer-events-none absolute inset-0 z-[15] opacity-[0.07] mix-blend-overlay"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)",
                  }}
                />

                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[26] rounded-b-lg bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-8 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/95 drop-shadow-sm sm:text-[10px] sm:tracking-[0.24em]">
                    Preview · not live capture
                  </p>
                </div>

                {isCamera && (
                  <motion.div
                    className="pointer-events-none absolute left-1/2 top-[42%] z-[16] h-[22%] w-[48%] -translate-x-1/2 rounded-md border-2 border-emerald-400/70"
                    initial={{ opacity: 0, scale: 1.15 }}
                    animate={{ opacity: [0, 1, 1, 0.6], scale: [1.12, 1.02, 1, 1] }}
                    transition={{ duration: scaledDuration(0.9), ease: "easeOut" }}
                  />
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={message}
                  className="text-center text-base font-semibold text-white"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: scaledDuration(0.22) }}
                >
                  {message}
                </motion.p>
              </AnimatePresence>
              <p className="mt-3 text-center text-[11px] text-slate-500 sm:text-xs">
                Animated preview · opens a sample receipt when complete
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
