import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { differenceInCalendarDays, format, isValid, parseISO, startOfDay } from "date-fns";
import { Loader2, Shield, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useUserShoppingPreferences } from "@/hooks/useUserShoppingPreferences";
import {
  describeWarrantyMonths,
  receiptsEligibleForEasyReturn,
  receiptsWithTrackedPurchaseDates,
  warrantyEndFromReceipt,
  warrantyWindowStartForProgress,
} from "@/lib/userShoppingPreferences";
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
  warrantyTracked: boolean;
  usedExplicitEndDate: boolean;
  purchaseDateIso: string | null;
  warrantyExpiresAtIso: string | null;
};

function toWarrantyItem(r: ReceiptWarrantyRow, today: Date, defaultWarrantyMonths: number): WarrantyItem | null {
  const end = warrantyEndFromReceipt(r.purchase_date, r.warranty_expires_at, defaultWarrantyMonths);
  if (!end) return null;
  const daysRemaining = differenceInCalendarDays(end, today);
  let tier: WarrantyItem["tier"];
  if (daysRemaining < 0) tier = "expired";
  else if (daysRemaining <= 13) tier = "urgent";
  else if (daysRemaining <= 30) tier = "amber";
  else tier = "safe";

  const windowStart = warrantyWindowStartForProgress(r.purchase_date, end, defaultWarrantyMonths);
  const windowDays = Math.max(1, differenceInCalendarDays(end, windowStart));
  const elapsed = differenceInCalendarDays(today, windowStart);
  const progressPct = Math.min(100, Math.max(0, (elapsed / windowDays) * 100));

  const productLabel =
    r.vendor_name?.trim() ||
    `Receipt ${format(end, "MMM yyyy")}`;

  const usedExplicitEndDate = Boolean(r.warranty_expires_at);

  return {
    id: r.id,
    productLabel,
    endDate: end,
    daysRemaining,
    tier,
    progressPct,
    warrantyTracked: r.warranty,
    usedExplicitEndDate,
    purchaseDateIso: r.purchase_date,
    warrantyExpiresAtIso: r.warranty_expires_at,
  };
}

function sortWarrantyItems(items: WarrantyItem[]): WarrantyItem[] {
  const activeCmp = (a: WarrantyItem, b: WarrantyItem) => {
    const t = a.endDate.getTime() - b.endDate.getTime();
    if (t !== 0) return t;
    return (b.warrantyTracked ? 1 : 0) - (a.warrantyTracked ? 1 : 0);
  };
  const expiredCmp = (a: WarrantyItem, b: WarrantyItem) => {
    const t = b.endDate.getTime() - a.endDate.getTime();
    if (t !== 0) return t;
    return (b.warrantyTracked ? 1 : 0) - (a.warrantyTracked ? 1 : 0);
  };
  const active = items.filter((i) => i.daysRemaining >= 0).sort(activeCmp);
  const expired = items.filter((i) => i.daysRemaining < 0).sort(expiredCmp);
  return [...active, ...expired];
}

function statusLabel(days: number): string {
  if (days < 0) return "Expired";
  if (days <= 13) return "Urgent";
  if (days <= 30) return "Expiring soon";
  return "Active";
}

function formatIsoDateLabel(iso: string | null): string {
  if (!iso?.trim()) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(startOfDay(d), "MMM d, yyyy") : iso;
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

type WarrantyBucket = "active" | "expiring30" | "expired";

function filterItemsByBucket(items: WarrantyItem[], bucket: WarrantyBucket): WarrantyItem[] {
  if (bucket === "expired") return items.filter((i) => i.daysRemaining < 0);
  if (bucket === "expiring30") return items.filter((i) => i.daysRemaining >= 0 && i.daysRemaining <= 30);
  return items.filter((i) => i.daysRemaining >= 0);
}

function bucketTitle(bucket: WarrantyBucket): string {
  if (bucket === "expired") return "Expired warranties";
  if (bucket === "expiring30") return "Within 30 days";
  return "Active warranties";
}

export default function WarrantyIntelligenceCard({ className }: Props) {
  const { user } = useAuth();
  const { warrantyDefaultMonths, returnWindowDays } = useUserShoppingPreferences();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReceiptWarrantyRow[]>([]);
  const [detailItem, setDetailItem] = useState<WarrantyItem | null>(null);
  const [listBucket, setListBucket] = useState<WarrantyBucket | null>(null);

  const fetchWarrantyReceipts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("receipts")
      .select("id, vendor_name, purchase_date, warranty, warranty_expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300);
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
      .filter((r) => r.warranty)
      .map((r) => toWarrantyItem(r, today, warrantyDefaultMonths))
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
  }, [rows, warrantyDefaultMonths]);

  const easyReturnPulse = useMemo(() => {
    const today = startOfDay(new Date());
    const withPurchaseTracked = receiptsWithTrackedPurchaseDates(rows, today);
    const eligibleList = receiptsEligibleForEasyReturn(rows, today, returnWindowDays);
    const eligibleCount = eligibleList.length;
    const urgentSoon = eligibleList.filter((e) => e.calendarDaysRemaining <= 3).length;
    const fillPct =
      returnWindowDays > 0 && withPurchaseTracked > 0
        ? Math.min(100, (eligibleCount / withPurchaseTracked) * 100)
        : 0;
    const next = eligibleList[0] ?? null;
    return { withPurchaseTracked, eligibleCount, urgentSoon, fillPct, next };
  }, [rows, returnWindowDays]);

  const bucketListItems = useMemo(
    () => (listBucket ? filterItemsByBucket(items, listBucket) : []),
    [items, listBucket],
  );

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
  const noReceiptsYet = rows.length === 0;
  const hasWarrantyReceiptsWithoutTimeline = rows.some((r) => r.warranty);

  const openBucket = (bucket: WarrantyBucket) => {
    setDetailItem(null);
    setListBucket(bucket);
  };

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
              Warranty coverage · easy returns · where to focus
            </p>
          </div>
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <div
          className="mb-6 rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/35 to-slate-950/20 p-4 ring-1 ring-sky-400/15 sm:p-5"
          aria-label="Easy return window status"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 ring-1 ring-sky-400/25">
                <Undo2 className="h-5 w-5 text-sky-300" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200/85">Easy returns left</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-sky-50">
                  {returnWindowDays > 0 ? easyReturnPulse.eligibleCount : "—"}
                </p>
                <p className="mt-0.5 text-xs text-sky-200/55">
                  {returnWindowDays > 0
                    ? `Receipts still inside your ${returnWindowDays}-day Profile return rule`
                    : "Add a non-zero return window in Profile to see what you can still send back"}
                </p>
              </div>
            </div>
            {returnWindowDays > 0 && easyReturnPulse.withPurchaseTracked > 0 && (
              <span className="shrink-0 rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-sky-100 ring-1 ring-sky-400/25">
                {easyReturnPulse.eligibleCount > 0
                  ? `${Math.round(easyReturnPulse.fillPct)}% of receipts with dates`
                  : "0% in window"}
              </span>
            )}
          </div>
          {returnWindowDays > 0 && easyReturnPulse.withPurchaseTracked > 0 && (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800/90">
                <motion.div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r",
                    easyReturnPulse.eligibleCount > 0
                      ? easyReturnPulse.urgentSoon > 0
                        ? "from-amber-400 to-orange-500"
                        : "from-sky-400 to-cyan-400"
                      : "from-slate-600 to-slate-500",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${easyReturnPulse.fillPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  aria-valuenow={Math.round(easyReturnPulse.fillPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  role="progressbar"
                  aria-label="Share of receipts with purchase dates that are still inside the return window"
                />
              </div>
              {easyReturnPulse.next && (
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                  Soonest deadline:{" "}
                  <span className="font-medium text-slate-200">{easyReturnPulse.next.productLabel}</span>
                  {" · "}
                  {easyReturnPulse.next.calendarDaysRemaining === 0 ? (
                    <span className="text-amber-200/90">return by today ({format(easyReturnPulse.next.deadline, "MMM d")})</span>
                  ) : (
                    <>
                      <span className="text-slate-300">
                        {easyReturnPulse.next.calendarDaysRemaining} day
                        {easyReturnPulse.next.calendarDaysRemaining === 1 ? "" : "s"} left
                      </span>
                      <span className="text-slate-500"> ({format(easyReturnPulse.next.deadline, "MMM d")})</span>
                    </>
                  )}
                </p>
              )}
              {easyReturnPulse.eligibleCount > 0 && easyReturnPulse.urgentSoon > 0 && (
                <p className="mt-1 text-[11px] font-medium text-amber-300/95">
                  {easyReturnPulse.urgentSoon} with a return deadline in 3 days or less — act soon
                </p>
              )}
              {easyReturnPulse.eligibleCount === 0 && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Nothing is still inside your Profile return window. New buys will show here automatically.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {empty ? (
        noReceiptsYet ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-950/50 px-6 py-14 text-center ring-1 ring-white/[0.04]">
          <p className="max-w-sm text-base font-medium leading-relaxed text-slate-200">
            Start warranty timelines from your receipts.
          </p>
          <p className="max-w-sm text-sm text-slate-500">
            Only receipts where you turn Warranty on appear here. Each one needs a purchase date or a saved warranty end
            — same as receipt detail. Adjust defaults in Profile.
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
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-950/50 px-6 py-14 text-center ring-1 ring-white/[0.04]">
          <p className="max-w-sm text-base font-medium leading-relaxed text-slate-200">
            {hasWarrantyReceiptsWithoutTimeline
              ? "Turn on warranty dates for flagged receipts."
              : "Enable warranty on receipts you want to track here."}
          </p>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {hasWarrantyReceiptsWithoutTimeline
              ? "You have receipts marked for warranty — add a purchase date or a saved warranty end date on each receipt (open it and edit)."
              : "Open any receipt and switch Warranty on — only those items appear in this dashboard. Dates use your Profile defaults or a saved warranty end."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl border border-slate-600 bg-slate-800 px-6 py-5 text-sm font-semibold text-white hover:bg-slate-700"
              onClick={() => navigate("/receipts")}
            >
              View receipts
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-orange-500 px-6 py-5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
              onClick={() => navigate("/upload")}
            >
              Scan a receipt
            </Button>
          </div>
        </div>
        )
      ) : (
        <>
          {/* Summary strip */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <motion.button
              type="button"
              className="rounded-2xl bg-emerald-500/[0.08] px-4 py-3.5 text-left ring-1 ring-emerald-400/20 transition hover:bg-emerald-500/[0.11] hover:ring-emerald-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
              onClick={() => openBucket("active")}
              whileTap={{ scale: 0.995 }}
              aria-label={`Active warranties: ${counts.activeCount}. Tap to see list`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/80">Active</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-100">{counts.activeCount}</p>
              <p className="mt-0.5 text-xs text-emerald-200/60">Valid coverage today · tap for list</p>
            </motion.button>
            <motion.button
              type="button"
              className="rounded-2xl bg-amber-500/[0.09] px-4 py-3.5 text-left ring-1 ring-amber-400/25 transition hover:bg-amber-500/[0.12] hover:ring-amber-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
              onClick={() => openBucket("expiring30")}
              whileTap={{ scale: 0.995 }}
              aria-label={`Warranties expiring within 30 days: ${counts.expiring30}. Tap to see list`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">Within 30 days</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-100">{counts.expiring30}</p>
              <p className="mt-0.5 text-xs text-amber-200/55">Approaching end date · tap for list</p>
            </motion.button>
            <motion.button
              type="button"
              className="rounded-2xl bg-rose-500/[0.08] px-4 py-3.5 text-left ring-1 ring-rose-400/20 transition hover:bg-rose-500/[0.11] hover:ring-rose-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
              onClick={() => openBucket("expired")}
              whileTap={{ scale: 0.995 }}
              aria-label={`Expired warranties: ${counts.expiredCount}. Tap to see list`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-200/85">Expired</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-rose-100">{counts.expiredCount}</p>
              <p className="mt-0.5 text-xs text-rose-200/55">Coverage ended · tap for list</p>
            </motion.button>
          </div>

          {hero && (
            <motion.button
              type="button"
              className="mb-6 w-full rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 text-left ring-1 ring-white/10 transition hover:from-white/[0.09] hover:ring-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 sm:p-6"
              onClick={() => setDetailItem(hero)}
              whileTap={{ scale: 0.995 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Next at risk</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="line-clamp-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {hero.productLabel}
                </p>
              </div>
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
                {hero.usedExplicitEndDate
                  ? "Warranty end date saved on this receipt."
                  : `Same rule as Summary & receipt detail: purchase date + ${describeWarrantyMonths(warrantyDefaultMonths)} (unless you set an end date).`}
              </p>
              <p className="mt-3 text-[11px] font-medium text-[#7CB87E]/90">Tap for source data · open full receipt</p>
            </motion.button>
          )}

          {supporting.length > 0 && (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Coming up</p>
              <ul className="space-y-3">
                {supporting.map((item) => (
                  <motion.li
                    key={item.id}
                    className="rounded-2xl bg-slate-950/35 ring-1 ring-white/[0.05] transition hover:ring-[#7CB87E]/25"
                    animate={
                      item.daysRemaining >= 0 && item.daysRemaining < 14
                        ? { boxShadow: ["0 0 0 rgba(244,63,94,0)", "0 0 20px rgba(244,63,94,0.12)", "0 0 0 rgba(244,63,94,0)"] }
                        : {}
                    }
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <button
                      type="button"
                      className="flex w-full flex-col p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400/40"
                      onClick={() => setDetailItem(item)}
                    >
                      <div className="flex w-full items-start gap-3">
                      <span
                        className={cn(
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                          tierDotClass[item.tier],
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-medium text-slate-100">{item.productLabel}</p>
                          </span>
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
                      </div>
                    <div className="mx-4 mb-4 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
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
                    <p className="px-4 pb-3 text-[10px] font-medium text-[#7CB87E]/80">Tap for details</p>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <Sheet
        open={listBucket !== null}
        onOpenChange={(open) => {
          if (!open) setListBucket(null);
        }}
      >
        <SheetContent side="right" className="w-full border-slate-600 sm:max-w-md flex flex-col overflow-hidden p-0">
          <div className="p-6 pb-2">
            <SheetHeader className="text-left">
              <SheetTitle>{listBucket ? bucketTitle(listBucket) : ""}</SheetTitle>
              <SheetDescription className="text-left text-slate-400">
                {listBucket === "expired" && "Warranty coverage has already ended on these receipts."}
                {listBucket === "expiring30" &&
                  "Coverage ends in 30 calendar days or less — same items as the dashboard counter."}
                {listBucket === "active" &&
                  "Receipts with warranty turned on that still have coverage (not expired). Tap a row for details."}
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {listBucket &&
              (bucketListItems.length === 0 ? (
                <p className="mt-6 text-sm text-slate-400">Nothing in this group right now.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {bucketListItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition",
                          "hover:border-[#7CB87E]/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40",
                        )}
                        onClick={() => {
                          setListBucket(null);
                          setDetailItem(item);
                        }}
                      >
                        <p className="font-medium text-slate-100">{item.productLabel}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Ends {format(item.endDate, "MMM d, yyyy")}
                          <span className="text-slate-400">
                            {" · "}
                            {item.daysRemaining < 0
                              ? `${Math.abs(item.daysRemaining)}d past`
                              : item.daysRemaining === 0
                                ? "last day"
                                : `${item.daysRemaining}d left`}
                          </span>
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={detailItem !== null} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent side="right" className="w-full border-slate-600 sm:max-w-md overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="pr-8 leading-snug">{detailItem.productLabel}</SheetTitle>
                <SheetDescription asChild>
                  <div className="space-y-1 text-left">
                    <p className="text-slate-300">
                      <span
                        className={cn(
                          "mr-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          detailItem.tier === "safe" && "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25",
                          detailItem.tier === "amber" && "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25",
                          detailItem.tier === "urgent" && "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/30",
                          detailItem.tier === "expired" && "bg-slate-600/40 text-slate-200 ring-1 ring-slate-500/30",
                        )}
                      >
                        {statusLabel(detailItem.daysRemaining)}
                      </span>
                      {detailItem.daysRemaining < 0
                        ? `Ended ${Math.abs(detailItem.daysRemaining)} day${Math.abs(detailItem.daysRemaining) === 1 ? "" : "s"} ago`
                        : detailItem.daysRemaining === 0
                          ? "Last day of coverage"
                          : `${detailItem.daysRemaining} calendar day${detailItem.daysRemaining === 1 ? "" : "s"} until warranty end`}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">Receipt id: {detailItem.id}</p>
                  </div>
                </SheetDescription>
              </SheetHeader>
              <dl className="mt-8 space-y-5 text-sm">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase date</dt>
                  <dd className="text-base text-slate-100">{formatIsoDateLabel(detailItem.purchaseDateIso)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Warranty ends</dt>
                  <dd className="text-base font-semibold text-slate-50">{format(detailItem.endDate, "MMM d, yyyy")}</dd>
                </div>
                {detailItem.warrantyExpiresAtIso && (
                  <div className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved warranty end date</dt>
                    <dd className="text-base text-slate-100">{formatIsoDateLabel(detailItem.warrantyExpiresAtIso)}</dd>
                  </div>
                )}
                <div className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">How this date was set</dt>
                  <dd className="text-slate-300">
                    {detailItem.usedExplicitEndDate
                      ? "Stored on the receipt (warranty end date field)."
                      : `Estimated from purchase date + ${describeWarrantyMonths(warrantyDefaultMonths)} (same as Summary & receipt detail).`}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Warranty flag on receipt</dt>
                  <dd className="text-slate-100">{detailItem.warrantyTracked ? "Yes — marked as warranty" : "No — timeline from purchase only"}</dd>
                </div>
              </dl>
              <SheetFooter className="mt-10 flex-col gap-2 sm:flex-col">
                <Button
                  type="button"
                  className="w-full rounded-xl bg-orange-500 font-semibold hover:bg-orange-600"
                  onClick={() => {
                    const id = detailItem.id;
                    setDetailItem(null);
                    navigate(`/receipt/${id}`);
                  }}
                >
                  Open full receipt
                </Button>
                <Button type="button" variant="secondary" className="w-full border border-slate-600 bg-slate-800 hover:bg-slate-700" onClick={() => setDetailItem(null)}>
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
