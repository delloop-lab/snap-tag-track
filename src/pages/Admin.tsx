import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Users, Receipt, ShieldCheck, Tag, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { buildRescanPatch } from "@/lib/rescanPreferences";
import { backfillMissingReceiptThumbnails } from "@/lib/backfillReceiptThumbnails";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface User {
  id: string;
  email: string;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  avatar_display_url?: string | null;
  receipt_count?: number;
  warranty_count?: number;
}

interface Client {
  name: string;
  receiptCount: number;
  userLabels: string[];
}

interface IssuerReceipt {
  id: string;
  user_id: string;
  vendor_name: string | null;
  purchase_date: string | null;
  total_amount: number | null;
  image_path: string | null;
  image_url: string;
  created_at: string;
}

const Admin = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReceipts: 0,
    totalWarranties: 0,
    tagCounts: [] as { tag: string; count: number }[],
    receiptTitleCounts: [] as { title: string; count: number }[],
    loading: true,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [isRunningGlobalRescan, setIsRunningGlobalRescan] = useState(false);
  const [globalRescanProgress, setGlobalRescanProgress] = useState<{ done: number; total: number } | null>(null);
  const [isRunningGlobalThumbs, setIsRunningGlobalThumbs] = useState(false);
  const [globalThumbsProgress, setGlobalThumbsProgress] = useState<{ done: number; total: number } | null>(null);
  const [isRefreshingIssuers, setIsRefreshingIssuers] = useState(false);
  const [issuerDialogOpen, setIssuerDialogOpen] = useState(false);
  const [selectedIssuerTitle, setSelectedIssuerTitle] = useState("");
  const [issuerReceipts, setIssuerReceipts] = useState<IssuerReceipt[]>([]);
  const [issuerReceiptsLoading, setIssuerReceiptsLoading] = useState(false);
  const navigate = useNavigate();
  const isAbsoluteUrl = (value?: string | null) => !!value && /^https?:\/\//i.test(value);
  const normalizeIssuerTitle = (raw?: string | null): string => {
    const trimmed = (raw || "").trim().replace(/\s+/g, " ");
    if (!trimmed) return "";
    return trimmed
      .toLowerCase()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };
  const normalizeTagName = (raw?: string | null): string => {
    const trimmed = (raw || "").trim().replace(/\s+/g, " ");
    if (!trimmed) return "";
    return trimmed
      .toLowerCase()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };
  const resolveAdminReceiptImageUrl = async (imagePath?: string | null): Promise<string> => {
    const raw = (imagePath || "").trim();
    if (!raw) return "/placeholder.svg";
    if (/^https?:\/\//i.test(raw)) return raw;

    const candidates = [raw];
    if (raw.startsWith("receipts/")) candidates.push(raw.replace(/^receipts\//, ""));
    else candidates.push(`receipts/${raw}`);

    for (const key of candidates) {
      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(key, 60 * 60);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    return "/placeholder.svg";
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch active users (logged in within last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: usersForActivity, error: usersActivityError } = await supabase
          .from("users")
          .select("id, created_at");
        let activeUserCount = 0;
        if (!usersActivityError && Array.isArray(usersForActivity)) {
          activeUserCount = usersForActivity.filter((u) => {
            const lastSeen = u?.created_at;
            if (!lastSeen) return false;
            return new Date(lastSeen) >= sixMonthsAgo;
          }).length;
        }

        // Fetch all receipts
        const { data: receipts } = await supabase
          .from("receipts")
          .select("id, warranty, purchase_date, client_name, user_id, vendor_name");

        // Fetch users for client ownership labels
        const { data: usersForClients } = await supabase
          .from("users")
          .select("id, first_name, last_name, email");
        const userLabelById = new Map<string, string>();
        (usersForClients || []).forEach((u) => {
          const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
          userLabelById.set(u.id, fullName || u.email || "Unknown user");
        });

        // Total receipts
        const totalReceipts = receipts?.length || 0;

        // Total warranties
        const totalWarranties = receipts?.filter(r => r.warranty).length || 0;

        // Receipt titles (issuer / vendor names)
        const vendorMap: Record<string, number> = {};
        receipts?.forEach((r) => {
          const title = normalizeIssuerTitle(r.vendor_name);
          if (!title) return;
          vendorMap[title] = (vendorMap[title] || 0) + 1;
        });
        const receiptTitleCounts = Object.entries(vendorMap)
          .map(([title, count]) => ({ title, count }))
          .sort((a, b) => b.count - a.count);

        // Client counts
        const clientMap = new Map<string, { receiptCount: number; users: Set<string> }>();
        receipts?.forEach(r => {
          if (r.client_name) {
            if (!clientMap.has(r.client_name)) {
              clientMap.set(r.client_name, { receiptCount: 0, users: new Set<string>() });
            }
            const entry = clientMap.get(r.client_name)!;
            entry.receiptCount += 1;
            if (r.user_id) {
              entry.users.add(r.user_id);
            }
          }
        });
        const clientList = [...clientMap.entries()]
          .map(([name, entry]) => ({
            name,
            receiptCount: entry.receiptCount,
            userLabels: [...entry.users].map((id) => userLabelById.get(id) || "Unknown user") || [],
          }))
          .sort((a, b) => b.receiptCount - a.receiptCount);
        setClients(clientList);
        setClientsLoading(false);

        // Fetch all receipt tags
        const { data: receiptTags } = await supabase
          .from("receipt_tags")
          .select("tag_id, tags(name)");

        // Tag counts
        const tagMap: Record<string, number> = {};
        receiptTags?.forEach(rt => {
          const tagName = normalizeTagName(rt.tags?.name);
          if (tagName) {
            tagMap[tagName] = (tagMap[tagName] || 0) + 1;
          }
        });
        const tagCounts = Object.entries(tagMap).map(([tag, count]) => ({ tag, count }));

        setStats({
          totalUsers: activeUserCount,
          totalReceipts,
          totalWarranties,
          tagCounts,
          receiptTitleCounts,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        const { data: userReceipts } = await supabase
          .from("receipts")
          .select("user_id, warranty");

        const receiptCountByUser = new Map<string, number>();
        const warrantyCountByUser = new Map<string, number>();
        (userReceipts || []).forEach((r) => {
          if (!r.user_id) return;
          receiptCountByUser.set(r.user_id, (receiptCountByUser.get(r.user_id) || 0) + 1);
          if (r.warranty) {
            warrantyCountByUser.set(r.user_id, (warrantyCountByUser.get(r.user_id) || 0) + 1);
          }
        });

        const usersWithCounts = await Promise.all((data || []).map(async (u) => {
          let avatarDisplayUrl = u.avatar_url || null;
          if (u.avatar_url && !isAbsoluteUrl(u.avatar_url)) {
            const { data: signedData, error: signedError } = await supabase.storage
              .from("avatars")
              .createSignedUrl(u.avatar_url, 60 * 60);
            avatarDisplayUrl = !signedError && signedData?.signedUrl ? signedData.signedUrl : null;
          }
          return {
            ...u,
            avatar_display_url: avatarDisplayUrl,
            receipt_count: receiptCountByUser.get(u.id) || 0,
            warranty_count: warrantyCountByUser.get(u.id) || 0,
          };
        }));
        setUsers(usersWithCounts);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchStats();
    fetchUsers();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const refreshReceiptTitleCounts = async () => {
    const { data: receipts, error } = await supabase
      .from("receipts")
      .select("vendor_name");
    if (error) return;

    const vendorMap: Record<string, number> = {};
    (receipts || []).forEach((r) => {
      const title = normalizeIssuerTitle(r.vendor_name);
      if (!title) return;
      vendorMap[title] = (vendorMap[title] || 0) + 1;
    });
    const receiptTitleCounts = Object.entries(vendorMap)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);

    setStats((prev) => ({ ...prev, receiptTitleCounts }));
  };

  const normalizeIssuerNamesWithoutAI = async () => {
    if (isRefreshingIssuers) return;
    setIsRefreshingIssuers(true);
    try {
      const { data: receipts, error } = await supabase
        .from("receipts")
        .select("id, user_id, vendor_name")
        .not("vendor_name", "is", null);
      if (error) throw error;

      let updated = 0;
      for (const row of receipts || []) {
        const current = row.vendor_name?.trim() || "";
        const normalized = normalizeIssuerTitle(current);
        if (!normalized || normalized === current) continue;
        const { error: updateError } = await supabase
          .from("receipts")
          .update({ vendor_name: normalized })
          .eq("id", row.id)
          .eq("user_id", row.user_id);
        if (!updateError) updated += 1;
      }

      await refreshReceiptTitleCounts();
      toast({
        title: "Receipt issuer list refreshed",
        description: updated > 0
          ? `Normalized ${updated} receipt issuer name${updated === 1 ? "" : "s"} without re-running AI.`
          : "Issuer list refreshed from existing data. No name changes were needed.",
      });
    } catch (error) {
      toast({
        title: "Issuer refresh failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingIssuers(false);
    }
  };

  const openIssuerReceipts = async (title: string) => {
    setSelectedIssuerTitle(title);
    setIssuerDialogOpen(true);
    setIssuerReceiptsLoading(true);
    setIssuerReceipts([]);
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("id, user_id, vendor_name, purchase_date, total_amount, image_path, created_at")
        .not("vendor_name", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const matching = (data || []).filter((r) => normalizeIssuerTitle(r.vendor_name) === title);
      const withImages = await Promise.all(
        matching.map(async (r) => ({
          ...r,
          image_url: await resolveAdminReceiptImageUrl(r.image_path),
        }))
      );
      setIssuerReceipts(withImages);
    } catch (error) {
      toast({
        title: "Failed to load issuer receipts",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIssuerReceiptsLoading(false);
    }
  };

  const runGlobalAiRescan = async () => {
    if (isRunningGlobalRescan) return;
    const confirmed = window.confirm(
      "Run AI reprocessing for all users' unprocessed receipts now? This may take a while."
    );
    if (!confirmed) return;

    setIsRunningGlobalRescan(true);
    try {
      let hasAiProcessedColumn = true;
      let { data: allReceipts, error: receiptsError } = await supabase
        .from("receipts")
        .select("id, user_id, image_path, vendor_name, total_amount, purchase_date, text_content, line_items, currency, ai_processed_at")
        .order("created_at", { ascending: false });
      if (receiptsError && /ai_processed_at|column|schema cache|does not exist/i.test(receiptsError.message || "")) {
        hasAiProcessedColumn = false;
        const fallback = await supabase
          .from("receipts")
          .select("id, user_id, image_path, vendor_name, total_amount, purchase_date, text_content, line_items, currency")
          .order("created_at", { ascending: false });
        allReceipts = fallback.data as any;
        receiptsError = fallback.error;
      }
      if (receiptsError) throw receiptsError;

      const all = (allReceipts || []) as Array<{
        id: string;
        user_id: string;
        image_path: string | null;
        vendor_name: string | null;
        total_amount: number | null;
        purchase_date: string | null;
        text_content: string | null;
        line_items: unknown[] | null;
        currency: string | null;
        ai_processed_at?: string | null;
      }>;
      const alreadyProcessed = all.filter((r) => !!r.ai_processed_at).length;
      const receipts = all.filter((r) => !r.ai_processed_at);
      setGlobalRescanProgress({ done: 0, total: receipts.length });
      let updated = 0;
      let processedNoChange = 0;
      let failed = 0;

      for (let i = 0; i < receipts.length; i += 1) {
        const receipt = receipts[i];
        try {
          if (!receipt.image_path) throw new Error("Missing image path");
          const { data: fnData, error: fnError } = await supabase.functions.invoke(
            "process-receipt",
            { body: { filePath: receipt.image_path } }
          );
          if (fnError) throw fnError;
          if (!fnData?.success) throw new Error(fnData?.error ?? "AI function failed");

          const patch = buildRescanPatch(
            {
              vendor_name: receipt.vendor_name,
              total_amount: receipt.total_amount,
              purchase_date: receipt.purchase_date,
              text_content: receipt.text_content,
              line_items: (receipt.line_items as unknown[] | null) ?? null,
              currency: receipt.currency ?? null,
            },
            fnData.data ?? {},
            false
          );
          const processedAt = new Date().toISOString();
          const updatePayload =
            Object.keys(patch).length > 0
              ? (hasAiProcessedColumn ? { ...patch, ai_processed_at: processedAt } : { ...patch })
              : (hasAiProcessedColumn ? { ai_processed_at: processedAt } : {});
          if (Object.keys(updatePayload).length === 0) {
            processedNoChange += 1;
            continue;
          }
          const { error: updateError } = await supabase
            .from("receipts")
            .update(updatePayload)
            .eq("id", receipt.id)
            .eq("user_id", receipt.user_id);
          if (updateError) throw updateError;
          if (Object.keys(patch).length > 0) {
            updated += 1;
          } else {
            processedNoChange += 1;
          }
        } catch {
          failed += 1;
        } finally {
          setGlobalRescanProgress({ done: i + 1, total: receipts.length });
        }
      }

      toast({
        title: "AI reprocessing complete",
        description: `Processed ${receipts.length}. Updated ${updated}. No-change ${processedNoChange}. Already processed ${alreadyProcessed}.${failed ? ` Failed ${failed}.` : ""}`,
      });
      await refreshReceiptTitleCounts();
    } catch (error) {
      toast({
        title: "Global AI reprocessing failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsRunningGlobalRescan(false);
      setGlobalRescanProgress(null);
    }
  };

  const runGlobalThumbnailBackfill = async () => {
    if (isRunningGlobalThumbs) return;
    const confirmed = window.confirm(
      "Generate missing thumbnails for all users' receipts now? This may take a while."
    );
    if (!confirmed) return;

    setIsRunningGlobalThumbs(true);
    try {
      const { data: allUsers, error: usersErr } = await supabase
        .from("users")
        .select("id");
      if (usersErr) throw usersErr;
      const userIds = (allUsers || []).map((u) => u.id);

      let done = 0;
      let total = 0;
      let created = 0;
      let skipped = 0;
      let failed = 0;

      setGlobalThumbsProgress({ done: 0, total: 0 });
      for (const userId of userIds) {
        const result = await backfillMissingReceiptThumbnails({
          userId,
          concurrency: 2,
          onProgress: (p) => {
            setGlobalThumbsProgress({ done: done + p.done, total: total + p.total });
          },
        });
        done += result.created + result.skipped + result.failed;
        total += result.created + result.skipped + result.failed;
        created += result.created;
        skipped += result.skipped;
        failed += result.failed;
        setGlobalThumbsProgress({ done, total });
      }

      toast({
        title: "Thumbnail backfill complete",
        description: `Created ${created}. Skipped ${skipped}. Failed ${failed}.`,
      });
    } catch (error) {
      toast({
        title: "Global thumbnail backfill failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsRunningGlobalThumbs(false);
      setGlobalThumbsProgress(null);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-8 rounded-2xl border border-slate-600 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-6">
            <p className="mb-2 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
              Admin area
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Administration
            </h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Manage users, receipts, processing jobs, and platform-wide statistics.
            </p>
          </header>
          
          {stats.loading ? (
            <div className="text-center text-slate-400">Loading...</div>
          ) : (
            <div className="space-y-8">
              <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-xl shadow-black/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Global Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-200 mb-3">
                    Run AI extraction for unprocessed receipts across all users and update receipt details.
                  </p>
                  {globalRescanProgress && (
                    <p className="text-sm text-slate-200 mb-3">
                      Progress: {globalRescanProgress.done} / {globalRescanProgress.total}
                    </p>
                  )}
                  <Button onClick={runGlobalAiRescan} disabled={isRunningGlobalRescan}>
                    {isRunningGlobalRescan ? "Running AI reprocess..." : "Run AI for unprocessed receipts"}
                  </Button>
                  <div className="mt-5 border-t border-slate-600 pt-4">
                    <p className="text-sm text-slate-300 mb-3">
                      Refresh and normalize the Receipt Titles (Issuer) list from existing receipt data only (no AI run).
                    </p>
                    <Button
                      variant="outline"
                      className="border-slate-400 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                      onClick={normalizeIssuerNamesWithoutAI}
                      disabled={isRefreshingIssuers}
                    >
                      {isRefreshingIssuers ? "Refreshing issuer list..." : "Refresh issuer list without AI"}
                    </Button>
                  </div>
                  <div className="mt-5 border-t border-slate-600 pt-4">
                    <p className="text-sm text-slate-200 mb-3">
                      Generate missing receipt thumbnails for all users.
                    </p>
                    {globalThumbsProgress && (
                      <p className="text-sm text-slate-200 mb-3">
                        Progress: {globalThumbsProgress.done} / {globalThumbsProgress.total}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="border-slate-400 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                      onClick={runGlobalThumbnailBackfill}
                      disabled={isRunningGlobalThumbs}
                    >
                      {isRunningGlobalThumbs ? "Running thumbnail backfill..." : "Run thumbnails for all receipts"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg transition-all hover:border-slate-500 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">New Users (Last 6 Months)</CardTitle>
                    <span className="rounded-lg border border-slate-600 bg-slate-800 p-2">
                      <Users className="h-4 w-4 text-blue-400" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-slate-400">Created within 6 months</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg transition-all hover:border-slate-500 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Total Receipts</CardTitle>
                    <span className="rounded-lg border border-slate-600 bg-slate-800 p-2">
                      <Receipt className="h-4 w-4 text-green-400" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 text-slate-100 hover:bg-transparent hover:text-white"
                      onClick={() => navigate("/admin/receipts")}
                    >
                      <div className="text-4xl font-bold">{stats.totalReceipts}</div>
                      <p className="text-xs text-slate-400">Uploaded receipts</p>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg transition-all hover:border-slate-500 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Total Warranties</CardTitle>
                    <span className="rounded-lg border border-slate-600 bg-slate-800 p-2">
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{stats.totalWarranties}</div>
                    <p className="text-xs text-slate-400">Active warranties</p>
                  </CardContent>
                </Card>
              </div>

              {/* User List */}
              <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    User List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center text-slate-400">Loading users...</div>
                  ) : (
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Receipts</TableHead>
                          <TableHead className="text-right">Warranties</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {user.avatar_display_url && (
                                  <img
                                    src={user.avatar_display_url}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  {user.first_name || user.last_name ? (
                                    <div className="font-medium">
                                      {[user.first_name, user.last_name].filter(Boolean).join(" ")}
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 italic">No name set</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="text-right font-medium">{user.receipt_count || 0}</TableCell>
                            <TableCell className="text-right font-medium">{user.warranty_count || 0}</TableCell>
                            <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client List */}
              <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    Client List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clientsLoading ? (
                    <div className="text-center text-slate-400">Loading clients...</div>
                  ) : clients.length === 0 ? (
                    <div className="text-center text-slate-400">No clients found</div>
                  ) : (
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>User(s)</TableHead>
                          <TableHead className="text-right">Receipt Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map((client) => (
                          <TableRow key={client.name}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>
                              {Array.isArray(client.userLabels) && client.userLabels.length > 0
                                ? client.userLabels.join(", ")
                                : "Unknown user"}
                            </TableCell>
                            <TableCell className="text-right">{client.receiptCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tag Distribution Chart */}
                <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg backdrop-blur-sm">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 p-6 pb-0">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Tag Distribution
                  </h2>
                  <div className="h-[300px] p-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.tagCounts}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis dataKey="tag" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg backdrop-blur-sm">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 p-6 pb-0">
                    <Receipt className="h-5 w-5 text-purple-500" />
                    Receipt Titles (Issuer)
                  </h2>
                  <div className="p-6 pt-0">
                    {stats.receiptTitleCounts.length === 0 ? (
                      <p className="text-sm text-slate-400">No receipt titles found.</p>
                    ) : (
                      <div className="max-h-[300px] overflow-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-600">
                              <th className="text-left py-2">Title</th>
                              <th className="text-right py-2">Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.receiptTitleCounts.map((item) => (
                              <tr key={item.title} className="border-b border-slate-600 last:border-0">
                                <td className="py-2">
                                  <button
                                    type="button"
                                    className="text-sky-300 hover:text-sky-200 hover:underline"
                                    onClick={() => openIssuerReceipts(item.title)}
                                  >
                                    {item.title}
                                  </button>
                                </td>
                                <td className="py-2 text-right font-medium">{item.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Tag Table */}
              <Card className="rounded-2xl border border-slate-600 bg-slate-900/70 text-slate-100 shadow-lg backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-green-500" />
                    Detailed Tag Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Tag</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Count</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.tagCounts.map((tc, index) => (
                          <tr key={tc.tag} className="border-b border-slate-600 hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                {tc.tag}
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 font-medium">{tc.count}</td>
                            <td className="text-right py-3 px-4 text-slate-400">
                              {((tc.count / stats.totalReceipts) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Dialog open={issuerDialogOpen} onOpenChange={setIssuerDialogOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Receipts for issuer: {selectedIssuerTitle}</DialogTitle>
                    <DialogDescription>
                      Click a row action to open that receipt in the admin receipts view.
                    </DialogDescription>
                  </DialogHeader>
                  {issuerReceiptsLoading ? (
                    <p className="text-sm text-slate-400">Loading receipts...</p>
                  ) : issuerReceipts.length === 0 ? (
                    <p className="text-sm text-slate-400">No receipts found for this issuer.</p>
                  ) : (
                    <div className="max-h-[70vh] overflow-auto space-y-3">
                      {issuerReceipts.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-2">
                          <img
                            src={r.image_url}
                            alt={r.vendor_name || "Receipt"}
                            className="w-14 h-14 rounded object-cover border"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{r.vendor_name || "Unknown issuer"}</p>
                            <p className="text-xs text-slate-400">
                              {r.purchase_date ? format(new Date(r.purchase_date), "MMM d, yyyy") : "No date"} ·
                              {" $"}{(r.total_amount ?? 0).toFixed(2)} · User {r.user_id.slice(0, 8)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/receipts?receiptId=${encodeURIComponent(r.id)}`)}
                          >
                            Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin; 