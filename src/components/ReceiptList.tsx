import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { formatDistanceToNow, format, isAfter, isBefore } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Filter, ChevronDown, ChevronUp, Loader2, FolderOpen } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useUserShoppingPreferences } from "@/hooks/useUserShoppingPreferences";
import { formatReceiptCurrency } from "@/lib/displayCurrency";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { getTagColor } from "./TagInput";
import { resolveReceiptThumbUrl } from "@/lib/receiptImageUrl";
import { LazyReceiptThumb } from "./LazyReceiptThumb";
import { ReceiptImagePreviewDialog } from "@/components/ReceiptImagePreviewDialog";
import { isClientDemoPreviewActive } from "@/lib/demo/demoMode";
import {
  buildClientDemoReceiptListForUI,
  buildClientDemoSummaryTags,
} from "@/lib/demo/clientDemoData";
import { openDemoRegisterPrompt } from "@/components/DemoRegisterPromptHost";

type Receipt = {
  id: string;
  user_id: string;
  image_path: string;
  text_content: string | null;
  vendor_name: string | null;
  total_amount: number | null;
  purchase_date: string | null;
  currency?: string | null;
  created_at: string;
  updated_at: string;
  tags?: { id: string; name: string }[];
  image_url?: string | null;
};

type Tag = {
  id: string;
  name: string;
};

const ReceiptList = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const demoPreview = isClientDemoPreviewActive(user);
  const { preferredDisplayCurrency } = useUserShoppingPreferences();

  // Filter states
  const [vendorFilter, setVendorFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [recentlyDeleted, setRecentlyDeleted] = useState<{receipt: Receipt, timeoutId: NodeJS.Timeout} | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; imagePath: string; tags?: { id: string; name: string }[] } | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<{ image_path: string; vendor_name: string | null } | null>(null);

  useEffect(() => {
    if (demoPreview) {
      setAllTags(buildClientDemoSummaryTags());
      return;
    }
    if (!user) return;

    const fetchTags = async () => {
      const { data: tags, error } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching tags:", error);
        return;
      }

      setAllTags(tags || []);
    };

    void fetchTags();
  }, [user, location.pathname]);

  useEffect(() => {
    void fetchReceipts();
  }, [user, location.pathname]);

  // Refresh receipts when the page becomes visible (e.g., after upload)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchReceipts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchReceipts = async () => {
    if (demoPreview) {
      try {
        setLoading(true);
        const base = buildClientDemoReceiptListForUI();
        const imageUrlByReceiptId = new Map<string, string>();
        await Promise.all(
          base.map(async (r) => {
            if (!r.image_path) return;
            const url = await resolveReceiptThumbUrl(r.image_path);
            if (url) imageUrlByReceiptId.set(r.id, url);
          }),
        );
        setReceipts(
          base.map((r) => ({
            ...r,
            image_url: imageUrlByReceiptId.get(r.id) ?? null,
          })),
        );
      } catch (error) {
        console.error("Error loading demo receipts:", error);
        toast({
          title: "Error",
          description: "Failed to load preview receipts",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!user) return;

    try {
      setLoading(true);

      // First fetch all receipts
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (receiptsError) throw receiptsError;

      const receiptIds = (receiptsData || []).map((receipt) => receipt.id);
      let tagsByReceiptId = new Map<string, { id: string; name: string }[]>();
      if (receiptIds.length > 0) {
        const { data: allTagData, error: tagsError } = await supabase
          .from("receipt_tags")
          .select(`
            receipt_id,
            tags:tag_id(id, name)
          `)
          .in("receipt_id", receiptIds);

        if (tagsError) {
          console.error("Error fetching receipt tags:", tagsError);
        } else {
          tagsByReceiptId = (allTagData || []).reduce((acc, row) => {
            const current = acc.get(row.receipt_id) || [];
            if (row.tags) current.push(row.tags as { id: string; name: string });
            acc.set(row.receipt_id, current);
            return acc;
          }, new Map<string, { id: string; name: string }[]>());
        }
      }

      const imageUrlByReceiptId = new Map<string, string>();
      await Promise.all(
        (receiptsData || []).map(async (receipt) => {
          if (!receipt.image_path) return;
          const url = await resolveReceiptThumbUrl(receipt.image_path);
          if (url) imageUrlByReceiptId.set(receipt.id, url);
        })
      );

      const receiptsWithTags = (receiptsData || []).map((receipt) => ({
        ...receipt,
        tags: tagsByReceiptId.get(receipt.id) || [],
        image_url: imageUrlByReceiptId.get(receipt.id) || null,
      }));

      // Ensure all objects have the expected properties, even if null
      const completeReceipts: Receipt[] = receiptsWithTags.map(item => ({
        id: item.id,
        user_id: item.user_id,
        image_path: item.image_path,
        text_content: item.text_content || null,
        vendor_name: item.vendor_name || null,
        total_amount: item.total_amount || null,
        purchase_date: item.purchase_date || null,
        currency: (item as { currency?: string | null }).currency ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        tags: item.tags || [],
        image_url: item.image_url
      }));

      setReceipts(completeReceipts);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast({
        title: "Error",
        description: "Failed to load receipts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, imagePath: string, tags?: { id: string; name: string }[]) => {
    if (demoPreview) {
      openDemoRegisterPrompt(
        "Preview mode",
        "Create a free account to delete receipts from your library.",
      );
      return;
    }
    // Always show the confirmation dialog first
    setPendingDelete({ id, imagePath, tags });
  };

  const confirmDelete = async (id: string) => {
    if (demoPreview) return;
    const deletedReceipt = receipts.find(r => r.id === id);
    if (!deletedReceipt) return;

    // Optimistically remove from UI
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));

    // Show toast with Undo
    let undoClicked = false;
    const timeoutId = setTimeout(async () => {
      if (!undoClicked) {
        // Delete child tag rows first to avoid FK constraint errors.
        const { error: tagsDeleteError } = await supabase
          .from("receipt_tags")
          .delete()
          .eq("receipt_id", id);
        if (tagsDeleteError) {
          setReceipts((prev) => [deletedReceipt, ...prev]);
          toast({
            title: "Error",
            description: "Failed to delete receipt tags",
            variant: "destructive",
          });
          setRecentlyDeleted(null);
          return;
        }

        const { error: dbError } = await supabase
          .from("receipts")
          .delete()
          .eq("id", id)
          .eq("user_id", deletedReceipt.user_id);
        if (dbError) {
          setReceipts((prev) => [deletedReceipt, ...prev]);
          toast({
            title: "Error",
            description: "Failed to delete receipt",
            variant: "destructive",
          });
        }
      }
      setRecentlyDeleted(null);
    }, 5000);

    setRecentlyDeleted({ receipt: deletedReceipt, timeoutId });

    toast({
      title: "Receipt deleted",
      description: (
        <span>
          Deleted. <button className="underline ml-2 font-semibold" onClick={() => {
            undoClicked = true;
            clearTimeout(timeoutId);
            setReceipts((prev) => [deletedReceipt, ...prev]);
            setRecentlyDeleted(null);
            toast({ title: "Restored", description: "Receipt has been restored." });
          }}>Undo</button>
        </span>
      ),
      duration: 5000,
    });
  };

  const formatCurrency = (amount: number | null, currency?: string | null) =>
    formatReceiptCurrency(amount, currency ?? null, preferredDisplayCurrency, { nullLabel: "N/A" });

  const addTagFilter = (tag: Tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTagFilter = (tagId: string) => {
    setSelectedTags(selectedTags.filter(tag => tag.id !== tagId));
  };

  const resetFilters = () => {
    setVendorFilter("");
    setMinAmount("");
    setMaxAmount("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedTags([]);
  };

  const filteredReceipts = receipts.filter(receipt => {
    // Filter by vendor name
    if (vendorFilter && receipt.vendor_name && 
        !receipt.vendor_name.toLowerCase().includes(vendorFilter.toLowerCase())) {
      return false;
    }

    // Filter by amount range
    const numMin = minAmount ? parseFloat(minAmount) : null;
    const numMax = maxAmount ? parseFloat(maxAmount) : null;
    
    if (numMin !== null && (receipt.total_amount === null || receipt.total_amount < numMin)) {
      return false;
    }
    
    if (numMax !== null && (receipt.total_amount === null || receipt.total_amount > numMax)) {
      return false;
    }

    // Filter by date range
    if (startDate && receipt.purchase_date && 
        isBefore(new Date(receipt.purchase_date), startDate)) {
      return false;
    }
    
    if (endDate && receipt.purchase_date && 
        isAfter(new Date(receipt.purchase_date), endDate)) {
      return false;
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      if (!receipt.tags || receipt.tags.length === 0) {
        return false;
      }
      
      const receiptTagIds = receipt.tags.map(tag => tag.id);
      const hasAllSelectedTags = selectedTags.every(tag => receiptTagIds.includes(tag.id));
      
      if (!hasAllSelectedTags) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:py-10">
        <header className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-2 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Receipt library
          </p>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Your receipts
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Browse everything you have captured. Filter by vendor, amount, dates, or tags, then open a receipt for
            details.
          </p>
        </header>
        <div className="mb-6 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled
            className="flex items-center gap-1 border-slate-500 bg-slate-800 text-slate-200"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          <Button disabled>Upload New Receipt</Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border border-slate-600 rounded-lg overflow-hidden shadow-sm bg-slate-800 flex sm:flex-col">
              <Skeleton className="w-24 sm:w-full sm:aspect-[3/4] h-24 sm:h-auto flex-shrink-0 bg-slate-700" />
              <div className="p-3 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-full mt-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:py-10">
      <header className="mx-auto mb-8 max-w-2xl text-center">
        <p className="mb-2 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
          <FolderOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Receipt library
        </p>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Your receipts
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Browse everything you have captured. Filter by vendor, amount, dates, or tags, then open a receipt for
          details.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
        >
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
        <Button
          onClick={() => {
            if (demoPreview) {
              openDemoRegisterPrompt(
                "Preview mode",
                "Create a free account to upload and store your own receipts.",
              );
              return;
            }
            navigate("/upload");
          }}
        >
          Upload New Receipt
        </Button>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="mb-6 space-y-4 rounded-lg border border-slate-600 bg-slate-900/70 p-4 text-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="vendor-filter">
                Vendor Name
              </label>
              <Input
                id="vendor-filter"
                placeholder="Filter by vendor"
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Range</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Min"
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
                />
                <span className="text-slate-300">to</span>
                <Input
                  placeholder="Max"
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white">
                      {startDate ? format(startDate, "PP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border border-slate-600 bg-slate-900 p-0 text-slate-100">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto rounded-md bg-slate-950 p-3 text-slate-100"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-slate-300">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white">
                      {endDate ? format(endDate, "PP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border border-slate-600 bg-slate-900 p-0 text-slate-100">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto rounded-md bg-slate-950 p-3 text-slate-100"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white">
                    Select tags
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border-slate-600 bg-slate-900 text-slate-100">
                  {allTags.map((tag) => (
                    <DropdownMenuItem 
                      key={tag.id}
                      onClick={() => addTagFilter(tag)}
                    >
                      {tag.name}
                    </DropdownMenuItem>
                  ))}
                  {allTags.length === 0 && (
                    <DropdownMenuItem disabled>No tags available</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Selected tag badges */}
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag.name}
                    <button 
                      onClick={() => removeTagFilter(tag.id)}
                      className="ml-1 rounded-full outline-none focus:shadow-outline hover:bg-gray-300/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white" onClick={resetFilters}>Reset Filters</Button>
          </div>
        </div>
      )}

      {filteredReceipts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-300">
            {receipts.length === 0 
              ? "You haven't uploaded any receipts yet."
              : "No receipts match your filters."}
          </p>
          {receipts.length === 0 && (
            <Button
              onClick={() => {
                if (demoPreview) {
                  openDemoRegisterPrompt(
                    "Preview mode",
                    "Create a free account to upload and store your own receipts.",
                  );
                  return;
                }
                navigate("/upload");
              }}
              className="mt-4"
            >
              Upload Your First Receipt
            </Button>
          )}
          {receipts.length > 0 && (
            <Button 
              variant="outline"
              onClick={resetFilters} 
              className="mt-4 border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="border border-slate-600 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-slate-800 flex sm:flex-col"
            >
              {/* Image — row on mobile, top on sm+ */}
              <button
                type="button"
                className="w-24 sm:w-full sm:aspect-[3/4] flex-shrink-0 bg-slate-700 relative cursor-zoom-in border-0 p-0 text-left focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-none sm:rounded-t-lg overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  if (receipt.image_path) setPreviewReceipt({ image_path: receipt.image_path, vendor_name: receipt.vendor_name });
                }}
                aria-label="View full receipt image"
              >
                <LazyReceiptThumb
                  src={receipt.image_url || "/placeholder.svg"}
                  alt=""
                  className="pointer-events-none"
                />
                {(!receipt.tags || receipt.tags.length === 0) && (
                  <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none">
                    Untagged
                  </span>
                )}
              </button>

              {/* Details */}
              <div
                role="button"
                tabIndex={0}
                className="p-3 flex-1 flex flex-col justify-between min-w-0 cursor-pointer hover:bg-slate-700/70 sm:rounded-b-lg"
                onClick={() => navigate(`/receipt/${receipt.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/receipt/${receipt.id}`);
                  }
                }}
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-100">
                        {receipt.vendor_name || "Unknown Vendor"}
                      </h3>
                    </div>
                    {!demoPreview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 p-0 text-slate-400 hover:bg-red-900/40 hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(receipt.id, receipt.image_path, receipt.tags);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {receipt.purchase_date
                      ? format(new Date(receipt.purchase_date), "MMM d, yyyy")
                      : formatDistanceToNow(new Date(receipt.updated_at), { addSuffix: true })}
                  </p>
                  {receipt.total_amount != null && (
                    <p className="mt-1 text-sm font-bold text-slate-100">
                      {formatCurrency(receipt.total_amount, receipt.currency)}
                    </p>
                  )}
                  {receipt.tags && receipt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {receipt.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag.id} variant="outline" className={`text-xs ${getTagColor(tag.name)}`}>
                          {tag.name}
                        </Badge>
                      ))}
                      {receipt.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-400">
                          +{receipt.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReceiptImagePreviewDialog
        open={!!previewReceipt}
        onOpenChange={(open) => !open && setPreviewReceipt(null)}
        imagePath={previewReceipt?.image_path}
        title={previewReceipt?.vendor_name || "Receipt"}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={open => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.tags && pendingDelete.tags.length > 0
                ? `This receipt has ${pendingDelete.tags.length} tag${pendingDelete.tags.length > 1 ? "s" : ""} and will be permanently removed. `
                : ""}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!pendingDelete) return;
                const id = pendingDelete.id;
                setPendingDelete(null);
                confirmDelete(id);
              }}
            >
              Yes, delete receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReceiptList;
