import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Camera, Tag, BarChart3, HelpCircle, Info, InfoIcon } from "lucide-react";
import { resolveReceiptThumbUrl, canonicalReceiptBucketObjectKey, primaryReceiptObjectKey } from "@/lib/receiptImageUrl";
import { ReceiptImagePreviewDialog } from "@/components/ReceiptImagePreviewDialog";

const THUMB_RESOLVE_MS = 12_000;

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
  const [recentThumbUrls, setRecentThumbUrls] = useState<{ [id: string]: string }>({});
  const [previewReceipt, setPreviewReceipt] = useState<{
    image_path: string;
    vendor_name?: string | null;
  } | null>(null);
  const [totalThisYear, setTotalThisYear] = useState(0);
  const [spendThisMonth, setSpendThisMonth] = useState<number | null>(null);
  const [untaggedCount, setUntaggedCount] = useState(0);
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
      .limit(isMobile ? 3 : 5);
    setRecentReceipts(receipts || []);
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

  // Handler for TAG button: go to last uploaded receipt or untagged view on mobile
  const handleTagClick = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (window.innerWidth < 768) {
      navigate("/tag-untagged");
      return;
    }
    // Desktop: go to last uploaded receipt as before
    const { data: receipts, error } = await supabase
      .from("receipts")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !receipts || receipts.length === 0) {
      navigate("/receipts");
      return;
    }
    navigate(`/receipt/${receipts[0].id}`);
  };

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <>
      <div className="flex flex-col items-center bg-white py-4 px-3 min-h-screen">
        <p className="text-lg text-gray-600 mb-4 text-center font-semibold">
          {user && firstName ? `Welcome back, ${firstName}!` : randomMessage.main}
        </p>
        <div className="flex flex-col gap-3 w-full items-center mb-8">
          <button className="w-full max-w-xs text-3xl py-5 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-full flex items-center justify-center gap-2 shadow-lg transition active:scale-95 font-bold" onClick={() => navigate("/upload")}>
            <Camera className="h-7 w-7" /> SNAP
          </button>
          <button className="w-full max-w-xs text-3xl py-5 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-full flex items-center justify-center gap-2 shadow-lg transition active:scale-95 font-bold" onClick={handleTagClick}>
            <Tag className="h-7 w-7" /> TAG
          </button>
          <button className="w-full max-w-xs text-3xl py-5 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-full flex items-center justify-center gap-2 shadow-lg transition active:scale-95 font-bold" onClick={() => navigate("/summary")}>
            <BarChart3 className="h-7 w-7" /> TRACK
          </button>
        </div>
        {user && recentReceipts.length > 0 && (
          <div className="w-full mb-4">
            <h2 className="text-lg font-semibold mb-2">Recent Receipts</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentReceipts.slice(0, 3).map((r, idx) => (
                <div key={r.id} className="border border-gray-200 rounded-xl bg-white flex-shrink-0 w-36 p-2 flex flex-col items-center shadow-sm hover:ring-2 hover:ring-orange-300 transition">
                  <button
                    type="button"
                    className="aspect-[3/4] w-full bg-gray-100 mb-2 overflow-hidden cursor-zoom-in rounded-lg border-0 p-0 focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                      <div className="w-full h-full bg-gray-200 animate-pulse min-h-[140px]" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={() => handleRecentClick(r.id)}
                  >
                    <div className="text-xs font-medium truncate w-full text-center">{r.vendor_name || "Unknown"}</div>
                    <div className="text-xs text-gray-400 text-center">{r.total_amount != null ? `${r.total_amount.toFixed(2)}` : "-"}</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="text-sm text-gray-400 text-center mt-2">
          {totalThisYear} receipt{totalThisYear === 1 ? "" : "s"} this year
        </div>
        <footer className="w-full text-center text-xs text-gray-300 mt-8 pb-2">
          Copyright &copy; 2025 The Novita Group
        </footer>
      </div>
      <ReceiptImagePreviewDialog
        open={!!previewReceipt}
        onOpenChange={(open) => !open && setPreviewReceipt(null)}
        imagePath={previewReceipt?.image_path}
        title={previewReceipt?.vendor_name || "Receipt"}
      />
      </>
    );
  }

  /* ── Desktop layout ── */
  return (
    <>
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Welcome */}
      <div className="flex items-center gap-4 mb-6">
        {avatarUrl && (
          <img src={avatarUrl} alt="Avatar" className="h-12 w-12 rounded-full object-cover border-2 border-orange-200" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
          </h1>
          <p className="text-sm text-gray-500">Here's what's happening with your receipts.</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Receipts this year</div>
          <div className="text-3xl font-bold text-orange-500">{totalThisYear}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Spent this month</div>
          <div className="text-3xl font-bold text-blue-500">
            {spendThisMonth != null ? spendThisMonth.toFixed(2) : "—"}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm cursor-pointer hover:border-orange-300 transition" onClick={() => navigate("/receipts")}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Untagged receipts</div>
          <div className="text-3xl font-bold text-green-500">{untaggedCount}</div>
          {untaggedCount > 0 && <div className="text-xs text-gray-400 mt-1">Click to review</div>}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex gap-3 mb-8">
        <button className="flex-1 py-4 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl flex items-center justify-center gap-2 shadow transition active:scale-95 font-bold text-lg" onClick={() => navigate("/upload")}>
          <Camera className="h-5 w-5" /> Snap Receipt
        </button>
        <button className="flex-1 py-4 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl flex items-center justify-center gap-2 shadow transition active:scale-95 font-bold text-lg" onClick={handleTagClick}>
          <Tag className="h-5 w-5" /> Tag
        </button>
        <button className="flex-1 py-4 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-xl flex items-center justify-center gap-2 shadow transition active:scale-95 font-bold text-lg" onClick={() => navigate("/summary")}>
          <BarChart3 className="h-5 w-5" /> Track
        </button>
      </div>

      {/* Recent receipts grid */}
      {recentReceipts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Recent Receipts</h2>
            <button className="text-sm text-orange-500 hover:text-orange-600 font-medium" onClick={() => navigate("/receipts")}>View all →</button>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {recentReceipts.slice(0, 5).map((r, idx) => (
              <div key={r.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 transition flex flex-col">
                <button
                  type="button"
                  className="aspect-[3/4] bg-gray-100 overflow-hidden cursor-zoom-in w-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
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
                    <div className="w-full h-full bg-gray-200 animate-pulse min-h-[120px]" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="p-2 text-left w-full hover:bg-muted/40 transition-colors"
                  onClick={() => handleRecentClick(r.id)}
                >
                  <div className="text-xs font-semibold truncate text-gray-800">{r.vendor_name || "Unknown"}</div>
                  <div className="text-xs text-gray-400">{r.purchase_date ? format(new Date(r.purchase_date), "MMM d") : "-"}</div>
                  <div className="text-xs font-bold text-gray-700 mt-0.5">{r.total_amount != null ? r.total_amount.toFixed(2) : "-"}</div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentReceipts.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-3">No receipts yet.</p>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition" onClick={() => navigate("/upload")}>
            Upload your first receipt
          </button>
        </div>
      )}

      <footer className="text-center text-xs text-gray-300 mt-12 pb-2">
        Copyright &copy; 2025 The Novita Group
      </footer>
    </div>
    <ReceiptImagePreviewDialog
      open={!!previewReceipt}
      onOpenChange={(open) => !open && setPreviewReceipt(null)}
      imagePath={previewReceipt?.image_path}
      title={previewReceipt?.vendor_name || "Receipt"}
    />
    </>
  );
};

export default Index;
