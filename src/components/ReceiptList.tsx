import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { formatDistanceToNow, format, isAfter, isBefore } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Filter, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
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

type Receipt = {
  id: string;
  user_id: string;
  image_path: string;
  text_content: string | null;
  vendor_name: string | null;
  total_amount: number | null;
  purchase_date: string | null;
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
  const { user } = useAuth();

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

  useEffect(() => {
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
    
    fetchTags();
  }, [user]);

  useEffect(() => {
    fetchReceipts();
  }, [user]);

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

      const receiptsWithTags = await Promise.all((receiptsData || []).map(async (receipt) => {
        // Fetch tags for each receipt
        const { data: tagData, error: tagError } = await supabase
          .from("receipt_tags")
          .select(`
            tag_id,
            tags:tag_id(id, name)
          `)
          .eq("receipt_id", receipt.id);

        if (tagError) {
          console.error("Error fetching tags for receipt:", tagError);
          return {
            ...receipt,
            tags: [],
            image_url: null
          };
        }

        const tags = tagData.map(item => item.tags);
        // Generate signed URL for the image
        let image_url = null;
        if (receipt.image_path) {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from('receipts').createSignedUrl(receipt.image_path, 60 * 60); // 1 hour expiry
          if (signedUrlError) {
            console.error('Error creating signed URL:', signedUrlError);
          } else {
            image_url = signedUrlData?.signedUrl;
          }
        }
        return {
          ...receipt,
          tags,
          image_url
        };
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
    // Always show the confirmation dialog first
    setPendingDelete({ id, imagePath, tags });
  };

  const confirmDelete = async (id: string) => {
    const deletedReceipt = receipts.find(r => r.id === id);
    if (!deletedReceipt) return;

    // Optimistically remove from UI
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));

    // Show toast with Undo
    let undoClicked = false;
    const timeoutId = setTimeout(async () => {
      if (!undoClicked) {
        const { error: dbError } = await supabase
          .from("receipts")
          .delete()
          .eq("id", id);
        if (dbError) {
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

  const formatCurrency = (amount: number | null, currency?: string | null) => {
    if (amount === null) return "N/A";
    if (!currency) return amount.toFixed(2);
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

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
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-2">
          <h2 className="text-2xl font-bold">Your Receipts</h2>
          <div className="flex gap-2">
            <Button variant="outline" disabled className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
            <Button disabled>Upload New Receipt</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border rounded-lg overflow-hidden shadow-sm bg-white flex sm:flex-col">
              <Skeleton className="w-24 sm:w-full sm:aspect-[3/4] h-24 sm:h-auto flex-shrink-0 bg-gray-100" />
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
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-2">
        <h2 className="text-2xl font-bold">Your Receipts</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
          <Button onClick={() => navigate("/upload")}>Upload New Receipt</Button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-4">
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
                />
                <span>to</span>
                <Input
                  placeholder="Max"
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {startDate ? format(startDate, "PP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span>to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {endDate ? format(endDate, "PP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Select tags
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
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
            <Button variant="outline" onClick={resetFilters}>Reset Filters</Button>
          </div>
        </div>
      )}

      {filteredReceipts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            {receipts.length === 0 
              ? "You haven't uploaded any receipts yet."
              : "No receipts match your filters."}
          </p>
          {receipts.length === 0 && (
            <Button 
              onClick={() => navigate("/upload")} 
              className="mt-4"
            >
              Upload Your First Receipt
            </Button>
          )}
          {receipts.length > 0 && (
            <Button 
              variant="outline"
              onClick={resetFilters} 
              className="mt-4"
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
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white flex sm:flex-col cursor-pointer"
              onClick={() => navigate(`/receipt/${receipt.id}`)}
            >
              {/* Image — row on mobile, top on sm+ */}
              <div className="w-24 sm:w-full sm:aspect-[3/4] flex-shrink-0 bg-gray-100 relative">
                <img
                  src={receipt.image_url || "/placeholder.svg"}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                {(!receipt.tags || receipt.tags.length === 0) && (
                  <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                    Untagged
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="font-semibold text-sm truncate">{receipt.vendor_name || "Unknown Vendor"}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(receipt.id, receipt.image_path, receipt.tags);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {receipt.purchase_date
                      ? format(new Date(receipt.purchase_date), "MMM d, yyyy")
                      : formatDistanceToNow(new Date(receipt.updated_at), { addSuffix: true })}
                  </p>
                  {receipt.total_amount != null && (
                    <p className="mt-1 font-bold text-sm text-gray-800">
                      {formatCurrency(receipt.total_amount, (receipt as any).currency)}
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
