import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Camera, Tag, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { resolveReceiptThumbUrl, canonicalReceiptBucketObjectKey, primaryReceiptObjectKey } from "@/lib/receiptImageUrl";
import { ReceiptImagePreviewDialog } from "@/components/ReceiptImagePreviewDialog";
import WarrantyIntelligenceCard from "@/components/WarrantyIntelligenceCard";

const THUMB_RESOLVE_MS = 12_000;
const CHART_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#ef4444"];

/** One resolved URL per storage object — avoids duplicate fetches when `fetchRecent` runs twice or receipts share/mirror paths in parallel Promise.all(). */
const resolvedThumbUrlByDedupeKey: Record<string, string> = {};
const inflightThumbByDedupeKey = new Map<string, Promise<string>>();

function receiptThumbDedupeKey(imagePath: string): string {
  return (
    primaryReceiptObjectKey(imagePath) ??
    (canonicalReceiptBucketObjectKey(imagePath.trim()) || imagePath.trim())
  );
}

async function resolveThumbWithTimeout(
  imagePath: string,
  ms: number
): Promise<string | null> {
  return Promise.race([
    resolveReceiptThumbUrl(imagePath),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function getRecentThumbUrl(imagePath: string): Promise<string> {
  const key = receiptThumbDedupeKey(imagePath);
  const cached = resolvedThumbUrlByDedupeKey[key];
  if (cached) return cached;

  const pending = inflightThumbByDedupeKey.get(key);
  if (pending) return pending;

  const created = (async () => {
    try {
      const resolved =
        (await resolveThumbWithTimeout(imagePath, THUMB_RESOLVE_MS)) ?? "/placeholder.svg";
      const finalUrl = resolved || "/placeholder.svg";
      if (finalUrl !== "/placeholder.svg") resolvedThumbUrlByDedupeKey[key] = finalUrl;
      return finalUrl;
    } finally {
      inflightThumbByDedupeKey.delete(key);
    }
  })();

  inflightThumbByDedupeKey.set(key, created);
  return created;
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [chartReceipts, setChartReceipts] = useState<Array<{
    purchase_date: string | null;
    total_amount: number | null;
    receipt_tags?: { tags?: { name?: string | null } | null }[] | null;
  }>>([]);
  const [recentThumbUrls, setRecentThumbUrls] = useState<{ [id: string]: string }>({});
  const [previewReceipt, setPreviewReceipt] = useState<{
    image_path: string;
    vendor_name?: string | null;
  } | null>(null);
  const [totalThisYear, setTotalThisYear] = useState(0);
  const [spendThisMonth, setSpendThisMonth] = useState<number | null>(null);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [showNoUntaggedModal, setShowNoUntaggedModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const recentFetchGen = useRef(0);

  // Punchy, benefit-led, practical, friendly, and confident messages
  const welcomeMessages = [
    {
      main: "Receipts you can actually find later.",
      sub: "No more digging through drawers or email threads. Snap, tag, done."
    },
    {
      main: "Turn every receipt into a searchable, trackable, organised record.",
      sub: "For spending, warranties, budgeting, or proof when you need it."
    },
    {
      main: "Snap your receipts and let us handle the rest.",
      sub: "Track spending. Save warranties. Be ready at tax time or return time."
    },
    {
      main: "Because life's too short to lose receipts.",
      sub: "Snap, tag, and track your purchases in seconds."
    },
    {
      main: "The simple way to organise receipts, track spending, and keep your warranties safe.",
      sub: "No spreadsheets. No stress. Just snap it and go."
    }
  ];
  // Pick a random message on each refresh
  const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
  const randomMessage = welcomeMessages[randomIndex];

  // Fetch recent receipts and stats function
  const fetchRecent = useCallback(async () => {
    if (!user) return;
    const year = new Date().getFullYear();
    const { data: receipts } = await supabase
      .from("receipts")
      .select("id, vendor_name, total_amount, purchase_date, image_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(isMobile ? 3 : 6);
    setRecentReceipts(receipts || []);

    const { data: chartData } = await supabase
      .from("receipts")
      .select("purchase_date,total_amount,receipt_tags(tag_id,tags:tag_id(name))")
      .eq("user_id", user.id);
    setChartReceipts(chartData || []);
    const gen = ++recentFetchGen.current;
    // Do not clear thumbnails up-front — a overlapping fetch clears them and then
    // an older completion can bail (gen mismatch), leaving thumbs empty forever.
    if (!receipts?.length) {
      if (gen === recentFetchGen.current) setRecentThumbUrls({});
    } else {
      const entries = await Promise.all(
        receipts.map(async (r) => {
          if (!r.image_path) return [r.id, "/placeholder.svg"] as const;
          try {
            const finalUrl = await getRecentThumbUrl(r.image_path);
            return [r.id, finalUrl] as const;
          } catch (error) {
            console.warn("[Index] Failed to resolve recent receipt thumbnail", {
              receiptId: r.id,
              imagePath: r.image_path,
              error,
            });
            return [r.id, "/placeholder.svg"] as const;
          }
        })
      );
      if (gen !== recentFetchGen.current) return;
      setRecentThumbUrls(Object.fromEntries(entries));
    }
    // Stat: total receipts this year
    const { count } = await supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${year}-01-01`);
    setTotalThisYear(count || 0);

    // Stat: spend this month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: monthData } = await supabase
      .from("receipts")
      .select("total_amount")
      .eq("user_id", user.id)
      .gte("purchase_date", monthStart);
    const spend = monthData?.reduce((sum, r) => sum + (r.total_amount || 0), 0) ?? 0;
    setSpendThisMonth(spend);

    // Stat: untagged receipts
    const { data: allIds } = await supabase
      .from("receipts")
      .select("id")
      .eq("user_id", user.id);
    const { data: taggedIds } = await supabase
      .from("receipt_tags")
      .select("receipt_id");
    const taggedSet = new Set((taggedIds || []).map((t) => t.receipt_id));
    const untagged = (allIds || []).filter((r) => !taggedSet.has(r.id)).length;
    setUntaggedCount(untagged);
  }, [user, isMobile]);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    chartReceipts.forEach((r) => {
      if (!r.purchase_date || !r.total_amount) return;
      const key = r.purchase_date.slice(0, 7);
      map[key] = (map[key] || 0) + r.total_amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({
        month: month.replace(
          /^(\d{4})-(\d{2})$/,
          (_, y, m) =>
            `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} ${y.slice(2)}`
        ),
        total: parseFloat(total.toFixed(2)),
      }));
  }, [chartReceipts]);

  const tagSpendData = useMemo(() => {
    const map: Record<string, number> = {};
    chartReceipts.forEach((r) => {
      (r.receipt_tags || []).forEach((rt) => {
        const name = rt.tags?.name;
        if (name && r.total_amount) {
          map[name] = (map[name] || 0) + r.total_amount;
        }
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [chartReceipts]);

  useEffect(() => {
    if (!loading && user) {
      // Fetch first name from user profile
      const fetchFirstName = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("first_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (!error && data) {
          const userData = data as { first_name?: string; avatar_url?: string };
          if (userData.first_name) setFirstName(userData.first_name);
          
          // Generate signed URL if avatar_url is a path
          if (userData.avatar_url) {
            const { data: signedData, error: signAvatarErr } = await supabase.storage
              .from('avatars')
              .createSignedUrl(userData.avatar_url, 60 * 60); // 1 hour expiry

            if (!signAvatarErr && signedData?.signedUrl) {
              setAvatarUrl(signedData.signedUrl);
            } else {
              setAvatarUrl("");
            }
          } else {
            setAvatarUrl("");
          }
        }
      };
      fetchFirstName();
      fetchRecent();
    }
  }, [user, loading, location.pathname]); // Re-fetch when returning to home page

  // Refresh receipts when the page becomes visible or when a receipt is added
  useEffect(() => {
    if (!user) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRecent();
      }
    };
    
    // Listen for custom event when a receipt is added
    const handleReceiptAdded = () => {
      fetchRecent();
    };
    
    // Refresh when window gains focus (user navigates back)
    const handleFocus = () => {
      if (location.pathname === '/') {
        fetchRecent();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('receiptAdded', handleReceiptAdded);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('receiptAdded', handleReceiptAdded);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, location.pathname, fetchRecent]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRecentClick = (id) => {
    navigate(`/summary?highlight=${id}`);
  };

  // Handler for TAG button: open any untagged receipt, else show modal.
  const handleTagClick = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: receipts, error } = await supabase
      .from("receipts")
      .select("id, receipt_tags(tag_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !receipts) {
      navigate("/receipts");
      return;
    }

    const untaggedReceipt = receipts.find(
      (receipt) => !receipt.receipt_tags || receipt.receipt_tags.length === 0,
    );

    if (!untaggedReceipt) {
      setShowNoUntaggedModal(true);
      return;
    }

    navigate(`/receipt/${untaggedReceipt.id}`);
  };

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <>
      <div className="flex min-h-full w-full flex-col items-center px-4 py-6 pb-20">
        <p className="mb-1 inline-flex rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7CB87E]">
          Dashboard
        </p>
        <p className="mb-6 text-center text-lg font-semibold text-white md:text-xl">
          {user && firstName ? `Welcome back, ${firstName}!` : randomMessage.main}
        </p>
        <div className="mb-8 flex w-full max-w-md flex-col items-stretch gap-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-5 text-xl font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 active:scale-[0.98]"
            onClick={() => navigate("/upload")}
          >
            <Camera className="h-7 w-7" /> SNAP
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4A8AE6] py-5 text-xl font-bold text-white shadow-lg shadow-black/20 transition hover:brightness-110 active:scale-[0.98]"
            onClick={handleTagClick}
          >
            <Tag className="h-7 w-7" /> TAG
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7CB87E] py-5 text-xl font-bold text-white shadow-lg shadow-black/20 transition hover:bg-[#6daa70] active:scale-[0.98]"
            onClick={() => navigate("/summary")}
          >
            <BarChart3 className="h-7 w-7" /> TRACK
          </button>
        </div>
        <WarrantyIntelligenceCard className="mb-8 w-full max-w-md mx-auto px-1" />
        {user && recentReceipts.length > 0 && (
          <div className="mb-4 w-full">
            <h2 className="mb-2 text-lg font-semibold text-white">Recent Receipts</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentReceipts.slice(0, 3).map((r, idx) => (
                <div
                  key={r.id}
                  className="flex w-36 flex-shrink-0 flex-col items-center rounded-2xl border border-slate-600 bg-slate-800/80 p-2 shadow-lg shadow-black/20 transition hover:border-orange-400/60"
                >
                  <button
                    type="button"
                    className="mb-2 aspect-[3/4] w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-600 bg-slate-900/80 p-0 focus:outline-none focus:ring-2 focus:ring-[#7CB87E]/50"
                    onClick={() => {
                      if (r.image_path) setPreviewReceipt({ image_path: r.image_path, vendor_name: r.vendor_name });
                    }}
                    aria-label="View full receipt image"
                  >
                    {recentThumbUrls[r.id] !== undefined ? (
                      <img
                        src={recentThumbUrls[r.id]}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="min-h-[140px] h-full w-full animate-pulse bg-slate-700" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={() => handleRecentClick(r.id)}
                  >
                    <div className="w-full truncate text-center text-xs font-medium text-slate-100">
                      {r.vendor_name || "Unknown"}
                    </div>
                    <div className="text-center text-xs text-slate-400">
                      {r.total_amount != null ? `${r.total_amount.toFixed(2)}` : "-"}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-2 text-center text-sm text-slate-400">
          {totalThisYear} receipt{totalThisYear === 1 ? "" : "s"} this year
        </div>
      </div>
      <ReceiptImagePreviewDialog
        open={!!previewReceipt}
        onOpenChange={(open) => !open && setPreviewReceipt(null)}
        imagePath={previewReceipt?.image_path}
        title={previewReceipt?.vendor_name || "Receipt"}
      />
      <AlertDialog open={showNoUntaggedModal} onOpenChange={setShowNoUntaggedModal}>
        <AlertDialogContent className="border-slate-600 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">All receipts are tagged</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              There are no untagged receipts right now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-orange-500 text-white hover:bg-orange-600">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  /* ── Desktop layout ── */
  return (
    <>
      <div className="mx-auto min-h-full w-full max-w-[1600px] px-4 py-6 pb-8 sm:px-6 lg:px-10 lg:py-10">
      {/* Welcome */}
      <div className="mb-6 flex flex-wrap items-start gap-4 sm:gap-6">
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-12 w-12 rounded-full border-2 border-[#7CB87E]/50 object-cover shadow-md shadow-black/30"
          />
        )}
        <div>
          <p className="mb-2 inline-flex rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7CB87E]">
            Your dashboard
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">Here's what's happening with your receipts.</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 lg:gap-6">
        <div className="rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Receipts this year</div>
          <div className="text-3xl font-bold text-orange-400">{totalThisYear}</div>
        </div>
        <div className="rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Spent this month</div>
          <div className="text-3xl font-bold text-sky-300">
            {spendThisMonth != null ? spendThisMonth.toFixed(2) : "—"}
          </div>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded-2xl border border-slate-600 bg-slate-700/70 p-5 text-left shadow-xl shadow-black/20 transition hover:border-[#7CB87E]/45 hover:bg-slate-700"
          onClick={() => navigate("/receipts")}
        >
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Untagged receipts</div>
          <div className="text-3xl font-bold text-[#7CB87E]">{untaggedCount}</div>
          {untaggedCount > 0 && <div className="mt-1 text-xs text-slate-500">Click to review</div>}
        </button>
      </div>

      {/* Actions row */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:flex-nowrap md:gap-4">
        <button
          type="button"
          className="flex min-h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] md:text-lg"
          onClick={() => navigate("/upload")}
        >
          <Camera className="h-5 w-5" /> Snap Receipt
        </button>
        <button
          type="button"
          className="flex min-h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4A8AE6] px-4 py-4 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:brightness-110 active:scale-[0.98] md:text-lg"
          onClick={handleTagClick}
        >
          <Tag className="h-5 w-5" /> Tag
        </button>
        <button
          type="button"
          className="flex min-h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#7CB87E] px-4 py-4 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:bg-[#6daa70] active:scale-[0.98] md:text-lg"
          onClick={() => navigate("/summary")}
        >
          <BarChart3 className="h-5 w-5" /> Track
        </button>
      </div>

      <div className="mb-8 w-full">
        <WarrantyIntelligenceCard />
      </div>

      {chartReceipts.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">Monthly Spend</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <RechartTooltip formatter={(v: number) => [`${v.toFixed(2)}`, "Spend"]} />
                  <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">Not enough data yet</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">Spend by Tag</h3>
            {tagSpendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={tagSpendData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {tagSpendData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartTooltip formatter={(v: number) => [`${v.toFixed(2)}`, "Spend"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">Tag receipts to see breakdown</p>
            )}
          </div>
        </div>
      )}

      {/* Recent receipts grid */}
      {recentReceipts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Receipts</h2>
            <button className="text-sm font-semibold text-[#7CB87E] transition hover:text-[#8fcf91]" type="button" onClick={() => navigate("/receipts")}>View all →</button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
            {recentReceipts.slice(0, 6).map((r, idx) => (
              <div
                key={r.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-800/80 shadow-lg shadow-black/20 transition hover:border-orange-400/40"
              >
                <button
                  type="button"
                  className="aspect-[3/4] w-full cursor-zoom-in overflow-hidden bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#7CB87E]/50"
                  onClick={() => {
                    if (r.image_path) setPreviewReceipt({ image_path: r.image_path, vendor_name: r.vendor_name });
                  }}
                  aria-label="View full receipt image"
                >
                  {recentThumbUrls[r.id] !== undefined ? (
                    <img
                      src={recentThumbUrls[r.id]}
                      alt=""
                      className="h-full w-full object-cover pointer-events-none"
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="min-h-[120px] h-full w-full animate-pulse bg-slate-700" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="w-full p-2 text-left transition-colors hover:bg-slate-700/50"
                  onClick={() => handleRecentClick(r.id)}
                >
                  <div className="truncate text-xs font-semibold text-slate-100">{r.vendor_name || "Unknown"}</div>
                  <div className="text-xs text-slate-400">{r.purchase_date ? format(new Date(r.purchase_date), "MMM d") : "-"}</div>
                  <div className="mt-0.5 text-xs font-bold text-slate-200">
                    {r.total_amount != null ? r.total_amount.toFixed(2) : "-"}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentReceipts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[#7CB87E]/40 bg-slate-900/40 py-16 text-center">
          <p className="mb-4 text-slate-400">No receipts yet.</p>
          <button
            type="button"
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
            onClick={() => navigate("/upload")}
          >
            Upload your first receipt
          </button>
        </div>
      )}
    </div>
    <ReceiptImagePreviewDialog
      open={!!previewReceipt}
      onOpenChange={(open) => !open && setPreviewReceipt(null)}
      imagePath={previewReceipt?.image_path}
      title={previewReceipt?.vendor_name || "Receipt"}
    />
    <AlertDialog open={showNoUntaggedModal} onOpenChange={setShowNoUntaggedModal}>
      <AlertDialogContent className="border-slate-600 bg-slate-900 text-slate-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">All receipts are tagged</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            There are no untagged receipts right now.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-orange-500 text-white hover:bg-orange-600">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default Index;
