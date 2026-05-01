import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { addYears, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ReceiptWarrantyRow = {
  id: string;
  vendor_name: string | null;
  purchase_date: string | null;
  warranty: boolean;
  warranty_expires_at: string | null;
};

type WarrantyItem = {
  id: string;
  productLabel: string;
  endDate: Date;
  daysRemaining: number;
  tier: "safe" | "amber" | "urgent" | "expired";
  progressPct: number;
};

/** Parse YYYY-MM-DD as local calendar date (no UTC drift). */
function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

function resolveWarrantyEnd(r: ReceiptWarrantyRow): Date | null {
  if (!r.warranty) return null;
  if (r.warranty_expires_at) {
    try {
      return parseLocalDate(r.warranty_expires_at);
    } catch {
      return null;
    }
  }
  if (!r.purchase_date) return null;
  try {
    const purchase = parseISO(r.purchase_date);
    return startOfDay(addYears(purchase, 1));
  } catch {
    return null;
  }
}

function toWarrantyItem(r: ReceiptWarrantyRow, today: Date): WarrantyItem | null {
  const end = resolveWarrantyEnd(r);
  if (!end) return null;
  const daysRemaining = differenceInCalendarDays(end, today);
  let tier: WarrantyItem["tier"];
  if (daysRemaining < 0) tier = "expired";
  else if (daysRemaining <= 13) tier = "urgent";
  else if (daysRemaining <= 30) tier = "amber";
  else tier = "safe";

  let windowStart: Date;
  try {
    windowStart = r.purchase_date ? startOfDay(parseISO(r.purchase_date)) : addYears(end, -1);
  } catch {
    windowStart = addYears(end, -1);
  }
  const windowDays = Math.max(1, differenceInCalendarDays(end, windowStart));
  const elapsed = differenceInCalendarDays(today, windowStart);
  const progressPct = Math.min(100, Math.max(0, (elapsed / windowDays) * 100));

  const productLabel =
    r.vendor_name?.trim() ||
    `Receipt ${format(end, "MMM yyyy")}`;

  return {
    id: r.id,
    productLabel,
    endDate: end,
    daysRemaining,
    tier,
    progressPct,
  };
}

function sortWarrantyItems(items: WarrantyItem[]): WarrantyItem[] {
  const active = items.filter((i) => i.daysRemaining >= 0).sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  const expired = items.filter((i) => i.daysRemaining < 0).sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  return [...active, ...expired];
}

function statusLabel(days: number): string {
  if (days < 0) return "Expired";
  if (days <= 13) return "Urgent";
  if (days <= 30) return "Expiring soon";
  return "Active";
}

const tierBarClass: Record<WarrantyItem["tier"], string> = {
  safe: "from-emerald-400 to-teal-500",
  amber: "from-amber-400 to-orange-500",
  urgent: "from-rose-500 to-red-600",
  expired: "from-slate-500 to-slate-600",
};

const tierDotClass: Record<WarrantyItem["tier"], string> = {
  safe: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]",
  amber: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  urgent: "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.5)]",
  expired: "bg-slate-500",
};

type Props = {
  className?: string;
};

export default function WarrantyIntelligenceCard({ className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReceiptWarrantyRow[]>([]);

  const fetchWarrantyReceipts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("receipts")
      .select("id, vendor_name, purchase_date, warranty, warranty_expires_at")
      .eq("user_id", user.id)
      .eq("warranty", true);
    if (error) {
      console.warn("[WarrantyIntelligence]", error.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchWarrantyReceipts();
  }, [fetchWarrantyReceipts]);

  useEffect(() => {
    const onReceiptAdded = () => void fetchWarrantyReceipts();
    window.addEventListener("receiptAdded", onReceiptAdded);
    return () => window.removeEventListener("receiptAdded", onReceiptAdded);
  }, [fetchWarrantyReceipts]);

  const { items, counts, hero, supporting } = useMemo(() => {
    const today = startOfDay(new Date());
    const itemsRaw = rows
      .map((r) => toWarrantyItem(r, today))
      .filter((x): x is WarrantyItem => x != null);
    const sorted = sortWarrantyItems(itemsRaw);

    let activeCount = 0;
    let expiring30 = 0;
    let expiredCount = 0;
    for (const i of sorted) {
      if (i.daysRemaining < 0) expiredCount += 1;
      else {
        activeCount += 1;
        if (i.daysRemaining <= 30) expiring30 += 1;
      }
    }

    const heroItem = sorted[0] ?? null;
    const support = heroItem ? sorted.slice(1, 5) : []; // max 4 supporting (+ hero = up to 5 lines)

    return {
      items: sorted,
      counts: { activeCount, expiring30, expiredCount },
      hero: heroItem,
      supporting: support,
    };
  }, [rows]);

  if (!user) return null;

  if (loading) {
    return (
      <section
        className={cn(
          "rounded-3xl border border-slate-600/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-xl shadow-black/30",
          className,
        )}
        aria-busy="true"
        aria-label="Warranty intelligence loading"
      >
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading warranties…</span>
        </div>
      </section>
    );
  }

  const empty = items.length === 0;

  return (
    <section
      className={cn(
        "rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-[#151b2e] to-slate-950 p-5 shadow-2xl shadow-black/40 sm:p-7",
        "ring-1 ring-white/[0.06]",
        className,
      )}
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7CB87E]/25 to-teal-500/20 ring-1 ring-[#7CB87E]/30">
            <Shield className="h-6 w-6 text-[#7CB87E]" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Warranty Intelligence</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              What expires soon · what&apos;s already gone · where to focus
            </p>
          </div>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-950/50 px-6 py-14 text-center ring-1 ring-white/[0.04]">
          <p className="max-w-sm text-base font-medium leading-relaxed text-slate-200">
            Start tracking warranties by scanning your first receipt.
          </p>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Enable warranty when you save a receipt — we&apos;ll estimate coverage and surface what needs attention.
          </p>
          <Button
            type="button"
            className="mt-8 rounded-xl bg-orange-500 px-8 py-6 text-base font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
            onClick={() => navigate("/upload")}
          >
            Scan a receipt
          </Button>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-500/[0.08] px-4 py-3.5 ring-1 ring-emerald-400/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80">Active</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-100">{counts.activeCount}</p>
              <p className="mt-0.5 text-xs text-emerald-200/60">Valid coverage today</p>
            </div>
            <div className="rounded-2xl bg-amber-500/[0.09] px-4 py-3.5 ring-1 ring-amber-400/25">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">Within 30 days</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-100">{counts.expiring30}</p>
              <p className="mt-0.5 text-xs text-amber-200/55">Approaching end date</p>
            </div>
            <div className="rounded-2xl bg-rose-500/[0.08] px-4 py-3.5 ring-1 ring-rose-400/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-200/85">Expired</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-rose-100">{counts.expiredCount}</p>
              <p className="mt-0.5 text-xs text-rose-200/55">Coverage ended</p>
            </div>
          </div>

          {hero && (
            <motion.button
              type="button"
              className="mb-6 w-full rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 text-left ring-1 ring-white/10 transition hover:from-white/[0.09] hover:ring-white/15 sm:p-6"
              onClick={() => navigate(`/receipt/${hero.id}`)}
              whileTap={{ scale: 0.995 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Next at risk</p>
              <p className="mt-2 line-clamp-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {hero.productLabel}
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div>
                  {hero.daysRemaining < 0 ? (
                    <>
                      <p className="text-4xl font-black tabular-nums tracking-tight text-rose-200 sm:text-5xl">
                        {Math.abs(hero.daysRemaining)}d
                      </p>
                      <p className="text-xs font-medium text-slate-400">since warranty ended</p>
                    </>
                  ) : hero.daysRemaining === 0 ? (
                    <>
                      <p className="text-4xl font-black tabular-nums tracking-tight text-rose-300 sm:text-5xl">
                        Today
                      </p>
                      <p className="text-xs font-medium text-slate-400">last day of coverage</p>
                    </>
                  ) : (
                    <>
                      <p className="text-4xl font-black tabular-nums tracking-tight text-white sm:text-5xl">
                        {hero.daysRemaining}
                      </p>
                      <p className="text-xs font-medium text-slate-400">
                        {hero.daysRemaining === 1 ? "day left" : "days left"}
                      </p>
                    </>
                  )}
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    hero.tier === "safe" && "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25",
                    hero.tier === "amber" && "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25",
                    hero.tier === "urgent" && "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/30",
                    hero.tier === "expired" && "bg-slate-600/40 text-slate-200 ring-1 ring-slate-500/30",
                  )}
                >
                  {statusLabel(hero.daysRemaining)}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Ends <span className="font-medium text-slate-200">{format(hero.endDate, "MMM d, yyyy")}</span>
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className={cn("h-full rounded-full bg-gradient-to-r", tierBarClass[hero.tier])}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${hero.progressPct}%`,
                    ...(hero.daysRemaining >= 0 && hero.daysRemaining < 14 ? { opacity: [0.86, 1, 0.86] as const } : { opacity: 1 }),
                  }}
                  transition={
                    hero.daysRemaining >= 0 && hero.daysRemaining < 14
                      ? {
                          width: { type: "spring", stiffness: 120, damping: 18 },
                          opacity: { duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" as const },
                        }
                      : { width: { type: "spring", stiffness: 120, damping: 18 } }
                  }
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Estimated from purchase unless you set a warranty end date on the receipt.
              </p>
            </motion.button>
          )}

          {supporting.length > 0 && (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Coming up</p>
              <ul className="space-y-3">
                {supporting.map((item) => (
                  <motion.li
                    key={item.id}
                    className="rounded-2xl bg-slate-950/35 p-4 ring-1 ring-white/[0.05]"
                    animate={
                      item.daysRemaining >= 0 && item.daysRemaining < 14
                        ? { boxShadow: ["0 0 0 rgba(244,63,94,0)", "0 0 20px rgba(244,63,94,0.12)", "0 0 0 rgba(244,63,94,0)"] }
                        : {}
                    }
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 text-left"
                      onClick={() => navigate(`/receipt/${item.id}`)}
                    >
                      <span
                        className={cn(
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                          tierDotClass[item.tier],
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="truncate font-medium text-slate-100">{item.productLabel}</p>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-white">
                            {item.daysRemaining < 0 ? (
                              <span className="text-slate-500">{Math.abs(item.daysRemaining)}d ago</span>
                            ) : item.daysRemaining === 0 ? (
                              <span className="text-rose-300">Today</span>
                            ) : (
                              <>{item.daysRemaining}d left</>
                            )}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{format(item.endDate, "MMM d, yyyy")}</p>
                      </div>
                    </button>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                          tierBarClass[item.tier],
                          item.daysRemaining >= 0 && item.daysRemaining < 14 && "motion-safe:animate-pulse",
                        )}
                        style={{
                          width: `${item.daysRemaining < 0 ? 100 : item.progressPct}%`,
                        }}
                      />
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
