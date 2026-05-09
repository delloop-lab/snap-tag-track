import React, { useEffect, useState, useMemo } from "react";
import {
  Tooltip as RechartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, ChevronDown, ChevronUp, Loader2, ShieldCheck, Tag, X, Printer, RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TagInput, { getTagColor } from "./TagInput";
import {
  buildRescanPatch,
  getRescanPreferencesFromDb,
  patchDiffLines,
} from "@/lib/rescanPreferences";
import type { RescanPreferences } from "@/lib/rescanPreferences";
import { resolveReceiptImageUrl } from "@/lib/receiptImageUrl";
import { toast } from "@/components/ui/use-toast";
import { validateWarrantyWithPurchaseDate } from "@/lib/warrantyRules";
import { useUserShoppingPreferences } from "@/hooks/useUserShoppingPreferences";
import {
  describeWarrantyMonths,
  warrantyEndFromReceipt,
} from "@/lib/userShoppingPreferences";
import { formatReceiptCurrency } from "@/lib/displayCurrency";
import { isClientDemoPreviewActive } from "@/lib/demo/demoMode";
import {
  buildClientDemoSummaryReceipts,
  buildClientDemoSummaryTags,
} from "@/lib/demo/clientDemoData";
import { openDemoRegisterPrompt } from "@/components/DemoRegisterPromptHost";

// Tag color palette
const tagColors = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
  'bg-red-200 text-red-800',
  'bg-indigo-200 text-indigo-800',
  'bg-teal-200 text-teal-800',
  'bg-orange-200 text-orange-800',
];

interface Tag {
  id: string;
  name: string;
}

interface ReceiptTag {
  tag_id: string;
  tags: Tag;
}

interface Receipt {
  id: string;
  receipt_tags: ReceiptTag[];
  vendor_name: string | null;
  purchase_date: string | null;
  total_amount: number | null;
  type: string | null;
  client_name: string | null;
  notes: string | null;
  warranty: boolean;
  warranty_expires_at?: string | null;
  image_path: string | null;
  product_image_path?: string | null;
  text_content: string | null;
  line_items?: unknown[] | null;
  currency?: string | null;
  created_at: string;
  updated_at: string;
}

const ReceiptSummaryList = () => {
  const { user } = useAuth();
  const demoPreview = isClientDemoPreviewActive(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [modalText, setModalText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Extracted Text");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [showWarrantyOnly, setShowWarrantyOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [imageLoaded, setImageLoaded] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [isBulkRescanning, setIsBulkRescanning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [showBulkRescanDialog, setShowBulkRescanDialog] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editingWarranty, setEditingWarranty] = useState(false);
  const [savingReceiptMeta, setSavingReceiptMeta] = useState(false);
  const [bulkRescanPrefs, setBulkRescanPrefs] = useState<RescanPreferences>({
    emptyOnly: false,
    previewDiff: false,
  });

  // Get the highlight ID from URL query params
  const highlightId = new URLSearchParams(location.search).get("highlight");

  const { warrantyDefaultMonths, preferredDisplayCurrency } = useUserShoppingPreferences();

  const formatMoneyCell = (amount: number | null, currency?: string | null) =>
    formatReceiptCurrency(amount, currency ?? null, preferredDisplayCurrency, { nullLabel: "-" });

  const fetchData = async () => {
    if (demoPreview) {
      setReceipts(buildClientDemoSummaryReceipts() as Receipt[]);
      setAllTags(buildClientDemoSummaryTags() as Tag[]);
      return;
    }
    if (!user) {
      setReceipts([]);
      setAllTags([]);
      return;
    }
    const { data: receiptsData } = await supabase
      .from("receipts")
      .select("*, receipt_tags(tag_id, tags:tag_id(id, name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const { data: tagsData } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id);

    setReceipts(receiptsData || []);
    setAllTags(tagsData || []);
  };

  useEffect(() => {
    setLoading(true);
    void fetchData().finally(() => setLoading(false));
  }, [user, location.pathname]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get unique client names from receipts for client filter
  const clients = Array.from(new Set(receipts.map(r => r.client_name).filter(Boolean)));
  clients.sort();

  // Get unique tags from receipts for tag filter (case-insensitive, lowercase)
  const tagNameSet = new Set();
  receipts.forEach(r => {
    (r.receipt_tags || []).forEach(rt => {
      if (rt.tags && rt.tags.name) {
        tagNameSet.add(rt.tags.name.toLowerCase());
      }
    });
  });
  const uniqueTagNames = Array.from(tagNameSet);
  uniqueTagNames.sort();

  // Get unique notes from receipts for notes filter
  const uniqueNotes = Array.from(new Set(receipts.map(r => r.notes).filter(Boolean)));
  uniqueNotes.sort();

  // Filtering logic
  const filteredReceipts = receipts.filter((r) => {
    if (search && r.vendor_name && !r.vendor_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedType && r.type !== selectedType) return false;
    if (selectedClient && r.client_name !== selectedClient) return false;
    if (selectedYear && (!r.purchase_date || !r.purchase_date.startsWith(selectedYear))) return false;
    if (dateFrom && (!r.purchase_date || r.purchase_date < dateFrom)) return false;
    if (dateTo && (!r.purchase_date || r.purchase_date > dateTo)) return false;
    if (minTotal && (!r.total_amount || r.total_amount < parseFloat(minTotal))) return false;
    if (maxTotal && (!r.total_amount || r.total_amount > parseFloat(maxTotal))) return false;
    if (selectedTags.length > 0) {
      const receiptTagNames = (r.receipt_tags || []).map(rt => rt.tags?.name?.toLowerCase());
      if (!selectedTags.every(tag => 
        receiptTagNames.includes(tag.name.toLowerCase())
      )) return false;
    }
    if (showWarrantyOnly && !r.warranty) return false;
    return true;
  });

  // Calculate total for filtered receipts
  const totalFiltered = filteredReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  // Get unique years from receipts for year filter
  const years = Array.from(new Set(receipts.map(r => r.purchase_date && r.purchase_date.slice(0, 4)).filter(Boolean)));
  years.sort((a, b) => b.localeCompare(a));

  // Determine if we should show the Warranty End Date column
  const showWarrantyEndDate = showWarrantyOnly || filteredReceipts.some(r => r.warranty);

  const handleTagFilter = (tagName: string) => {
    const tag: Tag = { id: Date.now().toString(), name: tagName };
    setSelectedTags((prev) => {
      const tagNameLower = tagName.toLowerCase();
      return prev.some(t => t.name.toLowerCase() === tagNameLower)
        ? prev.filter(t => t.name.toLowerCase() !== tagNameLower)
        : [...prev, tag];
    });
  };

  const removeTagFilter = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleViewText = (text) => {
    setModalText(text);
    setModalTitle("Extracted Text");
    setShowModal(true);
  };

  const handleViewNotes = (notes) => {
    setModalText(notes || "No notes");
    setModalTitle("Notes");
    setShowModal(true);
  };

  const openEditMetaModal = (receipt: Receipt) => {
    if (demoPreview) {
      openDemoRegisterPrompt(
        "Preview mode",
        "Create a free account to edit tags, warranty, and receipt details.",
      );
      return;
    }
    setEditingReceipt(receipt);
    setEditingWarranty(Boolean(receipt.warranty));
  };

  const saveReceiptMeta = async () => {
    if (demoPreview || !user || !editingReceipt || savingReceiptMeta) return;
    const metaErr = validateWarrantyWithPurchaseDate(editingWarranty, editingReceipt.purchase_date ?? null);
    if (metaErr) {
      toast({ title: "Purchase date needed", description: metaErr, variant: "destructive" });
      return;
    }
    setSavingReceiptMeta(true);
    try {
      await supabase
        .from("receipts")
        .update({ warranty: editingWarranty })
        .eq("id", editingReceipt.id)
        .eq("user_id", user.id);

      await fetchData();
      setEditingReceipt(null);
    } finally {
      setSavingReceiptMeta(false);
    }
  };

  const handleBulkRescan = async () => {
    if (demoPreview) {
      openDemoRegisterPrompt(
        "Preview mode",
        "Create a free account to rescan your receipts with AI.",
      );
      return;
    }
    if (!user || receipts.length === 0 || isBulkRescanning) return;
    const prefs = await getRescanPreferencesFromDb(supabase, user.id);
    setBulkRescanPrefs(prefs);
    setShowBulkRescanDialog(true);
  };

  const executeBulkRescan = async () => {
    if (demoPreview || !user || receipts.length === 0 || isBulkRescanning) return;
    const prefs = bulkRescanPrefs;
    setIsBulkRescanning(true);
    setBulkProgress({ done: 0, total: receipts.length });
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        try {
          if (!receipt.image_path) throw new Error("Missing image path");
          const { data: fnData, error: fnError } = await supabase.functions.invoke(
            "process-receipt",
            { body: { filePath: receipt.image_path } }
          );
          if (fnError) throw new Error(fnError.message);
          if (!fnData?.success) throw new Error(fnData?.error ?? "Function failed");

          const extracted = fnData.data ?? {};
          const current = {
            vendor_name: receipt.vendor_name,
            total_amount: receipt.total_amount,
            purchase_date: receipt.purchase_date,
            text_content: receipt.text_content,
            line_items: (receipt.line_items as unknown[] | null) ?? null,
            currency: receipt.currency ?? null,
          };
          const patch = buildRescanPatch(current, extracted, prefs.emptyOnly);
          const processedAt = new Date().toISOString();
          if (Object.keys(patch).length === 0) {
            let { error: processedMarkError } = await supabase
              .from("receipts")
              .update({ ai_processed_at: processedAt })
              .eq("id", receipt.id)
              .eq("user_id", user.id);
            if (processedMarkError && /ai_processed_at|column|schema cache|does not exist/i.test(processedMarkError.message || "")) {
              processedMarkError = null;
            }
            setBulkProgress({ done: i + 1, total: receipts.length });
            continue;
          }
          if (prefs.previewDiff) {
            const lines = patchDiffLines(current, patch).slice(0, 6);
            const approved = window.confirm(
              `Apply changes to "${receipt.vendor_name || "Unknown Vendor"}"? \n\n${lines.join(
                "\n"
              )}${lines.length === 6 ? "\n..." : ""}`
            );
            if (!approved) {
              let { error: processedMarkError } = await supabase
                .from("receipts")
                .update({ ai_processed_at: processedAt })
                .eq("id", receipt.id)
                .eq("user_id", user.id);
              if (processedMarkError && /ai_processed_at|column|schema cache|does not exist/i.test(processedMarkError.message || "")) {
                processedMarkError = null;
              }
              setBulkProgress({ done: i + 1, total: receipts.length });
              continue;
            }
          }
          let { error: updateError } = await supabase
            .from("receipts")
            .update({ ...patch, ai_processed_at: processedAt })
            .eq("id", receipt.id)
            .eq("user_id", user.id);
          if (updateError && /ai_processed_at|column|schema cache|does not exist/i.test(updateError.message || "")) {
            const fallback = await supabase
              .from("receipts")
              .update(patch)
              .eq("id", receipt.id)
              .eq("user_id", user.id);
            updateError = fallback.error;
          }
          if (updateError) throw updateError;
          successCount++;
        } catch {
          failCount++;
        } finally {
          setBulkProgress({ done: i + 1, total: receipts.length });
        }
      }

      const { data: refreshedReceipts } = await supabase
        .from("receipts")
        .select("*, receipt_tags(tag_id, tags:tag_id(id, name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setReceipts(refreshedReceipts || []);

      toast({
        title: "Bulk rescan complete",
        description: `Updated ${successCount} receipt${successCount === 1 ? "" : "s"}${failCount ? `, ${failCount} failed` : ""}.`,
      });
    } catch (error) {
      toast({
        title: "Bulk rescan failed",
        description: error instanceof Error ? error.message : "Unexpected error during bulk rescan.",
        variant: "destructive",
      });
    } finally {
      setIsBulkRescanning(false);
      setBulkProgress(null);
    }
  };

  const CHART_COLORS = ["#f97316","#3b82f6","#22c55e","#a855f7","#ec4899","#14b8a6","#eab308","#ef4444"];

  const tagSpendData = useMemo(() => {
    const map: Record<string, number> = {};
    receipts.forEach(r => {
      (r.receipt_tags || []).forEach(rt => {
        if (rt.tags?.name && r.total_amount) {
          map[rt.tags.name] = (map[rt.tags.name] || 0) + r.total_amount;
        }
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [receipts]);

  if (isMobile) {
    return (
      <div className="pt-1 px-2">
        <header className="mb-3 rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-center shadow-sm">
          <p className="mb-1 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-[11px] font-medium text-[#7CB87E]">
            Overview
          </p>
          <h2 className="text-xl font-bold text-white">Summary</h2>
        </header>
        {/* Spend by tag (replaces desktop-only warning on mobile) */}
        {receipts.length > 0 && (
          <div className="mb-3 rounded-xl border border-slate-600 bg-slate-800 p-4 shadow-sm">
            <h3 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-300 md:text-left">
              Spend by Tag
            </h3>
            {tagSpendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={tagSpendData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`}
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
              <p className="py-6 text-center text-sm text-slate-400">Tag receipts to see breakdown</p>
            )}
          </div>
        )}
        {/* Summary stats */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-4 snap-x">
          <div className="min-w-[140px] rounded-lg border border-slate-600 bg-slate-800/90 p-3 flex flex-col items-center justify-center snap-center">
            <div className="text-xs text-slate-400">Total Spent</div>
            <div className="text-lg font-bold text-slate-100">{formatMoneyCell(totalFiltered, null)}</div>
          </div>
          <div className="min-w-[140px] rounded-lg border border-slate-600 bg-slate-800/90 p-3 flex flex-col items-center justify-center snap-center">
            <div className="text-xs text-slate-400">Receipts</div>
            <div className="text-lg font-bold text-slate-100">{filteredReceipts.length}</div>
          </div>
          <button
            type="button"
            className={`min-w-[140px] rounded-lg p-3 flex flex-col items-center justify-center snap-center border-2 transition-colors ${showWarrantyOnly ? 'border-green-500 bg-green-900/30' : 'border-slate-600 bg-slate-800/90'}`}
            onClick={() => setShowWarrantyOnly(v => !v)}
            aria-pressed={showWarrantyOnly}
            title="Show only receipts with warranty"
          >
            <div className="text-xs text-slate-400">Warranty</div>
            <div className="text-lg font-bold text-slate-100">{filteredReceipts.filter(r => r.warranty).length}</div>
          </button>
        </div>
        {/* Filters */}
        <Button variant="outline" className="mb-3 flex w-full items-center justify-between border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white" onClick={() => setShowFiltersMobile(v => !v)}>
          Filters {showFiltersMobile ? <ChevronUp className="ml-2 w-4 h-4" /> : <ChevronDown className="ml-2 w-4 h-4" />}
        </Button>
        {showFiltersMobile && (
          <div className="mb-4 space-y-3 rounded-lg border border-slate-600 bg-slate-800 p-3">
            <Input placeholder="Search vendor..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border-slate-500 bg-slate-900 text-slate-100 placeholder:text-slate-400" />
            <select 
              value={selectedClient} 
              onChange={e => setSelectedClient(e.target.value)} 
              className="w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2 text-slate-100 shadow-sm scheme-dark focus:outline-none focus:ring-2 focus:ring-orange-400/30"
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select 
              value={selectedType} 
              onChange={e => setSelectedType(e.target.value)} 
              className="w-full rounded-md border border-slate-500 bg-slate-900 px-3 py-2 text-slate-100 shadow-sm scheme-dark focus:outline-none focus:ring-2 focus:ring-orange-400/30"
            >
              <option value="">All Types</option>
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
            </select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex w-full items-center justify-between border-slate-500 bg-slate-900 text-slate-100 hover:bg-slate-700 hover:text-white">
                  {selectedTags.length === 0 ? "Filter by tags" : selectedTags.map(tag => tag.name).join(", ")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[220px] border-slate-600 bg-slate-900 text-slate-100">
                {uniqueTagNames.map((tagName: string, idx: number) => (
                  <DropdownMenuCheckboxItem
                    key={tagName}
                    checked={selectedTags.some(t => t.name.toLowerCase() === tagName.toLowerCase())}
                    onCheckedChange={() => handleTagFilter(tagName)}
                    className="flex items-center gap-2"
                  >
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getTagColor(tagName)}`}>
                      {tagName}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
                {uniqueTagNames.length === 0 && (
                  <DropdownMenuCheckboxItem disabled>No tags available</DropdownMenuCheckboxItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-slate-600 bg-slate-800 p-3 shadow">
                <div className="flex items-start gap-3">
                  {/* No image skeleton in mobile */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-10 text-center text-lg text-slate-400">
            There Are No Receipts to Show
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-10 text-center text-lg text-slate-400">
            There Are No Receipts to Show
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredReceipts.map(r => (
              <div key={r.id} className="flex cursor-pointer flex-col gap-1 rounded-lg border border-slate-600 bg-slate-800 p-2 shadow transition-all duration-300"
                onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
              >
                <div className="flex items-start gap-2 justify-between">
                  {/* No image in mobile summary */}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{r.vendor_name || "Unknown Vendor"}</div>
                    <div className="truncate text-xs text-slate-400">{r.purchase_date ? format(new Date(r.purchase_date), 'MMM d, yyyy') : "No date"}</div>
                    <div className="mt-1 text-xs font-bold text-slate-100">{formatMoneyCell(r.total_amount, r.currency)}</div>
                    {r.warranty && <span className="mt-1 inline-flex items-center gap-1 rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-300"><ShieldCheck className="w-3 h-3" /> Warranty</span>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(r.receipt_tags || []).map((rt: ReceiptTag) => rt.tags && (
                        <Badge key={rt.tags.id} variant="outline" className={`text-xs ${getTagColor(rt.tags.name)}`}>
                          {rt.tags.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    size={expanded[r.id] ? "sm" : "sm"}
                    variant="outline" 
                    className={expanded[r.id] ? "ml-2 border-slate-500 bg-slate-900 text-base text-slate-100 hover:bg-slate-700 hover:text-white" : "ml-2 border-slate-500 bg-slate-900 text-xs text-slate-100 hover:bg-slate-700 hover:text-white"}
                    onClick={e => {
                      e.stopPropagation();
                      sessionStorage.setItem('scrollPosition', window.scrollY.toString());
                      navigate(`/receipt/${r.id}`, { state: { fromSummary: true } });
                    }}
                  >
                    Show Details
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-2 border-slate-500 bg-slate-700 text-xs text-slate-100 hover:bg-slate-600 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditMetaModal(r);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-24 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 sm:px-5">
        <p className="mb-2 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
          Overview
        </p>
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Summary</h2>
        <p className="mt-1 text-sm text-slate-600">Review receipts, filter quickly, and manage tags and warranty details.</p>
      </header>
      <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-900 shadow-lg md:gap-4 md:px-4">
        <Input
          placeholder="Search vendor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-40 min-w-[140px] border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
        />
        <div className="flex items-center gap-1">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-36 min-w-[120px] rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"
          >
            <option value="">All Types</option>
            <option value="Personal">Personal</option>
            <option value="Business">Business</option>
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-slate-400"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>Choose whether this is a personal or business receipt.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          <select 
            value={selectedClient} 
            onChange={e => setSelectedClient(e.target.value)} 
            className="w-36 min-w-[120px] rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-slate-400"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>Select a client for business receipts.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="w-28 min-w-[100px] rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"
        >
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex gap-2 items-center">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 min-w-[120px] border-slate-300 bg-white text-slate-900" />
          <span className="text-xs text-slate-500">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 min-w-[120px] border-slate-300 bg-white text-slate-900" />
        </div>
        <div className="flex items-center gap-1">
          <Input type="number" placeholder="Min total" value={minTotal} onChange={e => setMinTotal(e.target.value)} className="w-28 min-w-[90px] border-slate-300 bg-white text-slate-900 placeholder:text-slate-400" />
          <span className="text-xs text-slate-500">to</span>
          <Input type="number" placeholder="Max total" value={maxTotal} onChange={e => setMaxTotal(e.target.value)} className="w-28 min-w-[90px] border-slate-300 bg-white text-slate-900 placeholder:text-slate-400" />
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                {selectedTags.length === 0 ? "Filter by tags" : selectedTags.map(tag => tag.name).join(", ")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] border-slate-600 bg-slate-900 text-slate-100">
              {uniqueTagNames.map((tagName: string, idx: number) => (
                <DropdownMenuCheckboxItem
                  key={tagName}
                  checked={selectedTags.some(t => t.name.toLowerCase() === tagName.toLowerCase())}
                  onCheckedChange={() => handleTagFilter(tagName)}
                  className="flex items-center gap-2"
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getTagColor(tagName)}`}>
                    {tagName}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
              {uniqueTagNames.length === 0 && (
                <DropdownMenuCheckboxItem disabled>No tags available</DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-slate-400"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>Tags help you categorize and filter receipts (e.g., Power, Water, Gas, etc.).</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showWarrantyOnly ? "default" : "outline"}
            onClick={() => setShowWarrantyOnly(v => !v)}
            className="mt-2 h-9 min-w-[160px] md:mt-0"
          >
            {showWarrantyOnly ? "Showing Warranty Only" : "Show Warranty Only"}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-slate-400"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>
                Show only receipts with a warranty. End date uses your profile default (
                {describeWarrantyMonths(warrantyDefaultMonths)} from purchase) unless you saved an end date on the
                receipt.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="default"
            className="h-9 min-w-[120px] mt-2 md:mt-0 ml-2 bg-orange-500 hover:bg-orange-600 text-white font-bold"
            onClick={() => {
              if (demoPreview) {
                openDemoRegisterPrompt(
                  "Preview mode",
                  "Printing is available after you create an account.",
                );
                return;
              }
              window.print();
            }}
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button
            variant="outline"
            className="ml-2 mt-2 h-9 min-w-[140px] border-slate-300 bg-white text-slate-900 hover:bg-slate-50 md:mt-0"
            onClick={handleBulkRescan}
            disabled={isBulkRescanning || receipts.length === 0}
          >
            {isBulkRescanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {bulkProgress ? `Rescanning ${bulkProgress.done}/${bulkProgress.total}` : "Rescanning..."}
              </>
            ) : (
              <>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Rescan All with AI
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="mb-4 text-lg font-semibold text-slate-900">
        Total for filtered receipts: <span className="text-orange-600">{formatMoneyCell(totalFiltered, null)}</span>
      </div>

      {filteredReceipts.length === 0 ? (
        <div className="py-10 text-center text-lg text-slate-500">
          There Are No Receipts to Show
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
          <table className="min-w-full text-xs text-slate-800 md:text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Vendor</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Date</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Total</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Type</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Client</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Tags</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Warranty</th>
                {showWarrantyEndDate && <th className="border-b border-slate-200 p-2 text-left md:p-3">Warranty End Date</th>}
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Receipt</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Product</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Notes</th>
                <th className="border-b border-slate-200 p-2 text-left md:p-3">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map(r => (
                <tr 
                  key={r.id}
                  className={highlightId === r.id ? "bg-orange-500/15 cursor-pointer" : "cursor-pointer"}
                  onClick={() => navigate(`/receipt/${r.id}`)}
                >
                  <td className="border-b border-slate-100 p-2 md:p-3">{r.vendor_name || "-"}</td>
                  <td className="border-b border-slate-100 p-2 md:p-3">{r.purchase_date ? format(new Date(r.purchase_date), "PPP") : "-"}</td>
                  <td className="border-b border-slate-100 p-2 md:p-3">{formatMoneyCell(r.total_amount, r.currency)}</td>
                  <td className="border-b border-slate-100 p-2 md:p-3">{r.type || "-"}</td>
                  <td className="border-b border-slate-100 p-2 md:p-3">{r.client_name || "-"}</td>
                  <td className="border-b border-slate-100 p-2 md:p-3">
                    {(r.receipt_tags || []).map((rt: ReceiptTag) => rt.tags && (
                      <Badge key={rt.tags.id} variant="outline" className={`text-xs ${getTagColor(rt.tags.name)}`}>
                        {rt.tags.name}
                      </Badge>
                    ))}
                  </td>
                  <td className="border-b border-slate-100 p-2 text-center md:p-3">
                    {r.warranty ? <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Yes</span> : <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">No</span>}
                  </td>
                  {showWarrantyEndDate && (
                    <td className="border-b border-slate-100 p-2 text-center md:p-3">
                      {r.warranty
                        ? (() => {
                            const end = warrantyEndFromReceipt(
                              r.purchase_date ?? null,
                              r.warranty_expires_at ?? null,
                              warrantyDefaultMonths,
                            );
                            return end ? format(end, "PPP") : "-";
                          })()
                        : "-"}
                    </td>
                  )}
                  <td className="border-b border-slate-100 p-2 md:p-3">
                    <Button size="sm" variant="outline" onClick={async (e) => {
                      e.stopPropagation();
                      if (r.image_path) {
                        const imageUrl = await resolveReceiptImageUrl(r.image_path, 60 * 60);
                        if (imageUrl) window.open(imageUrl, '_blank');
                      }
                    }}>View Receipt</Button>
                  </td>
                  <td className="border-b border-slate-100 p-2 md:p-3">
                    {r.product_image_path ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const imageUrl = await resolveReceiptImageUrl(r.product_image_path || "", 60 * 60);
                          if (imageUrl) window.open(imageUrl, "_blank");
                        }}
                      >
                        View Product
                      </Button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border-b border-slate-100 p-2 md:p-3">
                    {r.notes ? (
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleViewNotes(r.notes);
                      }}>View Notes</Button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border-b border-slate-100 p-2 md:p-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditMetaModal(r);
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 p-6 text-slate-100 shadow-lg">
            <h3 className="mb-2 text-lg font-bold text-white">{modalTitle}</h3>
            <pre className="mb-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded border border-slate-600 bg-slate-800 p-3 text-slate-100">{modalText}</pre>
            <Button
              variant="outline"
              className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
              onClick={() => setShowModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
      {editingReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-lg">
            <h3 className="mb-1 text-lg font-bold text-white">Edit Tags & Warranty</h3>
            <p className="mb-4 text-sm text-slate-400">
              {editingReceipt.vendor_name || "Unknown Vendor"}
            </p>

            <div className="mb-4">
              <label className={`flex items-center gap-2 text-sm font-medium ${editingReceipt.purchase_date?.trim() ? "text-slate-100" : "text-slate-500"}`}>
                <input
                  type="checkbox"
                  checked={editingWarranty}
                  onChange={(e) => setEditingWarranty(e.target.checked)}
                  disabled={!editingReceipt.purchase_date?.trim()}
                  className="h-4 w-4 rounded border-slate-400 bg-slate-800 accent-orange-500 focus-visible:ring-2 focus-visible:ring-orange-400/60 disabled:opacity-50"
                />
                Warranty applies to this receipt
              </label>
              {!editingReceipt.purchase_date?.trim() && (
                <p className="mt-2 text-xs text-slate-500">
                  Add a purchase date on the receipt first (open receipt &amp; edit) before marking warranty.
                </p>
              )}
            </div>

            <div className="mb-5">
              <TagInput
                receiptId={editingReceipt.id}
                onTagsChange={fetchData}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                onClick={() => setEditingReceipt(null)}
                disabled={savingReceiptMeta}
              >
                Close
              </Button>
              <Button onClick={saveReceiptMeta} disabled={savingReceiptMeta}>
                {savingReceiptMeta ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={showBulkRescanDialog} onOpenChange={setShowBulkRescanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rescan all receipts with AI?</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {`You are about to rescan ${receipts.length} receipt${
                receipts.length === 1 ? "" : "s"
              }.\n\nThis can update vendor, total, date, text, line items, and currency.\n\nCurrent mode: ${
                bulkRescanPrefs.emptyOnly
                  ? "only empty fields will be filled"
                  : "existing values may be replaced"
              }.\nDiff preview: ${
                bulkRescanPrefs.previewDiff
                  ? "ON (you will confirm each receipt)"
                  : "OFF"
              }.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowBulkRescanDialog(false);
                executeBulkRescan();
              }}
            >
              Yes, rescan all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReceiptSummaryList; 