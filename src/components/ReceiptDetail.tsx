import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import TagInput, { getTagColor } from "./TagInput";
import TagSuggestion from "./TagSuggestion";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Edit, Printer, ChevronDown, ChevronUp, Trash2, RefreshCcw } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/AuthProvider";
import {
  buildRescanPatch,
  getRescanPreferencesFromDb,
  patchDiffLines,
} from "@/lib/rescanPreferences";
import { resolveReceiptImageUrl } from "@/lib/receiptImageUrl";
import { validateWarrantyWithPurchaseDate } from "@/lib/warrantyRules";
import { useUserShoppingPreferences } from "@/hooks/useUserShoppingPreferences";
import { formatReceiptCurrency } from "@/lib/displayCurrency";
import {
  describeWarrantyMonths,
  suggestedReturnDeadline,
  warrantyEndFromReceipt,
} from "@/lib/userShoppingPreferences";
import { DEMO_RECEIPTS_DATASET } from "@/lib/demo/demoDataset";
import { isClientDemoPreviewActive } from "@/lib/demo/demoMode";
import {
  buildClientDemoReceiptDetail,
  isClientDemoReceiptId,
} from "@/lib/demo/clientDemoData";
import { openDemoRegisterPrompt } from "@/components/DemoRegisterPromptHost";

interface LineItem {
  description: string;
  amount: number;
}

type Receipt = {
  id: string;
  user_id: string;
  image_path: string;
  product_image_path?: string | null;
  text_content: string | null;
  vendor_name: string | null;
  total_amount: number | null;
  purchase_date: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  warranty: boolean;
  warranty_expires_at?: string | null;
  receipt_tags: { tag_id: string; tags: { id: string; name: string } }[];
  client_name: string | null;
  type: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  line_items: LineItem[] | null;
  currency: string | null;
};

function fallbackDemoProductImagePath(receipt: Pick<Receipt, "type" | "vendor_name" | "product_image_path">): string | null {
  if (receipt.product_image_path) return receipt.product_image_path;
  if (receipt.type !== "demo") return null;
  const vendor = receipt.vendor_name?.trim();
  if (!vendor) return null;
  const demo = DEMO_RECEIPTS_DATASET.find((r) => r.vendor === vendor);
  return demo?.productImage ?? null;
}

const ReceiptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const demoPreview = isClientDemoPreviewActive(user);
  const { warrantyDefaultMonths, returnWindowDays, preferredDisplayCurrency } = useUserShoppingPreferences();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVendor, setEditedVendor] = useState("");
  const [editedAmount, setEditedAmount] = useState("");
  const [editedDate, setEditedDate] = useState<Date | undefined>(undefined);
  const [editedNotes, setEditedNotes] = useState("");
  const [editedWarranty, setEditedWarranty] = useState(false);
  const [tagsRefreshKey, setTagsRefreshKey] = useState(0);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isNarrowScreen = window.innerWidth < 768;
    return isMobileDevice || isNarrowScreen;
  });
  const [editedClient, setEditedClient] = useState("");
  const [allClients, setAllClients] = useState<string[]>([]);
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [showLineItems, setShowLineItems] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [showDeleteProductImageDialog, setShowDeleteProductImageDialog] = useState(false);
  const [showRescanDialog, setShowRescanDialog] = useState(false);
  const [rescanDialogText, setRescanDialogText] = useState("");

  // Move fetchReceipt outside useEffect
  const fetchReceipt = async () => {
    if (!id) return;
    try {
      setLoading(true);
      if (demoPreview && isClientDemoReceiptId(id)) {
        const built = buildClientDemoReceiptDetail(id);
        if (!built) throw new Error("Demo receipt not found");
        const receiptData = built as unknown as Receipt;
        setReceipt(receiptData);
        if (receiptData.image_path) {
          const resolved = await resolveReceiptImageUrl(receiptData.image_path, 60 * 60 * 24);
          setImageUrl(resolved || "/placeholder.svg");
        } else {
          setImageUrl("/placeholder.svg");
        }
        const productPath = fallbackDemoProductImagePath(receiptData);
        if (productPath) {
          const resolvedProduct = await resolveReceiptImageUrl(productPath, 60 * 60 * 24);
          setProductImageUrl(resolvedProduct);
        } else {
          setProductImageUrl(null);
        }
        setEditedVendor(receiptData.vendor_name || "");
        setEditedAmount(receiptData.total_amount?.toString() || "");
        setEditedNotes(receiptData.notes || "");
        setEditedWarranty(!!receiptData.warranty);
        if (receiptData.purchase_date) {
          setEditedDate(new Date(receiptData.purchase_date));
        } else {
          setEditedDate(undefined);
        }
        setEditedClient(receiptData.client_name || "");
        return;
      }

      if (!user?.id) {
        setReceipt(null);
        return;
      }

      const { data, error } = await supabase
        .from("receipts")
        .select(`
          id,
          user_id,
          image_path,
          product_image_path,
          text_content,
          vendor_name,
          total_amount,
          purchase_date,
          created_at,
          updated_at,
          notes,
          warranty,
          warranty_expires_at,
          client_name,
          type,
          latitude,
          longitude,
          location_name,
          line_items,
          currency,
          receipt_tags(
            tag_id,
            tags:tag_id(id, name)
          )
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      if (!data) {
        throw new Error("Receipt not found or access denied");
      }
      const receiptData: Receipt = {
        id: data.id,
        user_id: data.user_id,
        image_path: data.image_path,
        product_image_path: data.product_image_path ?? null,
        text_content: data.text_content,
        vendor_name: data.vendor_name,
        total_amount: data.total_amount,
        purchase_date: data.purchase_date,
        created_at: data.created_at,
        updated_at: data.updated_at,
        notes: data.notes || "",
        warranty: data.warranty ?? false,
        warranty_expires_at: data.warranty_expires_at ?? null,
        receipt_tags: data.receipt_tags || [],
        client_name: data.client_name || "",
        type: data.type || "",
        latitude: data.latitude,
        longitude: data.longitude,
        location_name: data.location_name || "",
        line_items: (data as any).line_items ?? null,
        currency: (data as any).currency ?? null,
      };
      setReceipt(receiptData);
      // Generate signed URL for the image with longer expiry
      if (data.image_path) {
        const resolved = await resolveReceiptImageUrl(data.image_path, 60 * 60 * 24);
        setImageUrl(resolved);
      } else {
        setImageUrl(null);
      }
      // Generate signed URL for product image if present
      const productPath = fallbackDemoProductImagePath({
        type: data.type || null,
        vendor_name: data.vendor_name || null,
        product_image_path: data.product_image_path ?? null,
      });
      if (productPath) {
        const resolvedProduct = await resolveReceiptImageUrl(productPath, 60 * 60 * 24);
        setProductImageUrl(resolvedProduct);
      } else {
        setProductImageUrl(null);
      }
      // Initialize edit fields with current values
      setEditedVendor(receiptData.vendor_name || "");
      setEditedAmount(receiptData.total_amount?.toString() || "");
      setEditedNotes(receiptData.notes || "");
      setEditedWarranty(!!receiptData.warranty);
      if (receiptData.purchase_date) {
        setEditedDate(new Date(receiptData.purchase_date));
      }
      setEditedClient(receiptData.client_name || "");
    } catch (error) {
      console.error("Error fetching receipt:", error);
      toast({
        title: "Error",
        description: "Failed to load receipt details",
        variant: "destructive",
      });
      navigate(
        demoPreview && id && isClientDemoReceiptId(id) ? "/dashboard" : "/receipts",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReceipt();
  }, [id, user]);

  useEffect(() => {
    if (demoPreview && id && isClientDemoReceiptId(id)) {
      setAllClients([]);
      return;
    }
    const fetchClients = async () => {
      const { data } = await supabase
        .from("receipts")
        .select("client_name")
        .neq("client_name", null);
      if (data) {
        const uniqueClients = Array.from(new Set(data.map((r) => r.client_name).filter(Boolean)));
        setAllClients(uniqueClients);
      }
    };
    void fetchClients();
  }, [id]);

  // Add effect to fetch product image URL when receipt changes
  useEffect(() => {
    const fetchProductImageUrl = async () => {
      const productPath = receipt ? fallbackDemoProductImagePath(receipt) : null;
      if (productPath) {
        const resolved = await resolveReceiptImageUrl(productPath, 60 * 60);
        setProductImageUrl(resolved);
      } else {
        setProductImageUrl(null);
      }
    };

    fetchProductImageUrl();
  }, [receipt?.product_image_path, receipt?.type, receipt?.vendor_name]);

  useEffect(() => {
    const handleResize = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isNarrowScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isNarrowScreen);
    };
    handleResize(); // Check once on mount
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const formatCurrency = (amount: number | null, currencyCode?: string | null) => {
    const fromReceipt = currencyCode ?? receipt?.currency ?? null;
    return formatReceiptCurrency(amount, fromReceipt, preferredDisplayCurrency, { nullLabel: "Not available" });
  };

  const handleDelete = async () => {
    if (!receipt) return;
    if (demoPreview && isClientDemoReceiptId(receipt.id)) return;

    try {
      // Delete child tag rows first to avoid FK constraint errors.
      const { error: tagsDeleteError } = await supabase
        .from("receipt_tags")
        .delete()
        .eq("receipt_id", receipt.id);
      if (tagsDeleteError) throw tagsDeleteError;

      // Delete receipt row.
      const { error: dbError } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receipt.id)
        .eq("user_id", receipt.user_id);

      if (dbError) throw dbError;

      toast({
        title: "Receipt deleted",
        description: "The receipt has been removed successfully",
      });

      navigate("/receipts");
    } catch (error) {
      console.error("Error deleting receipt:", error);
      toast({
        title: "Error",
        description: "Failed to delete receipt",
        variant: "destructive",
      });
    }
  };

  const handleRescanWithAI = async () => {
    if (!receipt?.image_path || !user) return;
    if (demoPreview && isClientDemoReceiptId(receipt.id)) return;
    setIsRescanning(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "process-receipt",
        { body: { filePath: receipt.image_path } }
      );

      if (fnError) throw new Error(fnError.message);
      if (!fnData?.success) throw new Error(fnData?.error ?? "Rescan failed");

      const extracted = fnData.data ?? {};
      const prefs = await getRescanPreferencesFromDb(supabase, user.id);
      const current = {
        vendor_name: receipt.vendor_name,
        total_amount: receipt.total_amount,
        purchase_date: receipt.purchase_date,
        text_content: receipt.text_content,
        line_items: (receipt.line_items as unknown[] | null) ?? null,
        currency: receipt.currency,
      };
      const patch = buildRescanPatch(current, extracted, prefs.emptyOnly);
      const processedAt = new Date().toISOString();
      const changedFields = Object.keys(patch);
      if (changedFields.length === 0) {
        let { error: processedMarkError } = await supabase
          .from("receipts")
          .update({ ai_processed_at: processedAt })
          .eq("id", receipt.id);
        if (processedMarkError && /ai_processed_at|column|schema cache|does not exist/i.test(processedMarkError.message || "")) {
          processedMarkError = null;
        }
        toast({
          title: "Nothing to update",
          description: prefs.emptyOnly
            ? "No empty fields were available to fill."
            : "AI returned no changes for this receipt.",
        });
        return;
      }
      if (prefs.previewDiff) {
        const lines = patchDiffLines(current, patch).slice(0, 8);
        const approved = window.confirm(
          `Apply these changes?\n\n${lines.join("\n")}${lines.length === 8 ? "\n..." : ""}`
        );
        if (!approved) return;
      }

      let { error: updateError } = await supabase
        .from("receipts")
        .update({ ...patch, ai_processed_at: processedAt })
        .eq("id", receipt.id);
      if (updateError && /ai_processed_at|column|schema cache|does not exist/i.test(updateError.message || "")) {
        const fallback = await supabase
          .from("receipts")
          .update(patch)
          .eq("id", receipt.id);
        updateError = fallback.error;
      }

      if (updateError) throw updateError;
      await fetchReceipt();
      toast({
        title: "Receipt rescanned",
        description: "AI extraction has been updated for this receipt.",
      });
    } catch (error) {
      console.error("Error rescanning receipt:", error);
      toast({
        title: "Rescan failed",
        description: error instanceof Error ? error.message : "Could not rescan this receipt.",
        variant: "destructive",
      });
    } finally {
      setIsRescanning(false);
    }
  };

  const openRescanDialog = async () => {
    if (!user) return;
    if (receipt && demoPreview && isClientDemoReceiptId(receipt.id)) return;
    const prefs = await getRescanPreferencesFromDb(supabase, user.id);
    setRescanDialogText(
      `AI will re-check this receipt and may update vendor, total, date, text, line items, and currency.\n\nCurrent mode: ${
        prefs.emptyOnly ? "only empty fields will be filled" : "existing values may be replaced"
      }.\nDiff preview: ${prefs.previewDiff ? "ON (you confirm changes)" : "OFF"}.`
    );
    setShowRescanDialog(true);
  };

  const handleSaveChanges = async () => {
    if (!receipt) return;
    if (demoPreview && isClientDemoReceiptId(receipt.id)) return;
    const nextPurchaseIso = editedDate ? format(editedDate, "yyyy-MM-dd") : null;
    const warrantyErr = validateWarrantyWithPurchaseDate(editedWarranty, nextPurchaseIso);
    if (warrantyErr) {
      toast({ title: "Purchase date needed", description: warrantyErr, variant: "destructive" });
      return;
    }
    const parsedAmount = editedAmount ? parseFloat(editedAmount) : null;
    try {
      const { error } = await supabase
        .from("receipts")
        .update({
          vendor_name: editedVendor || null,
          total_amount: parsedAmount,
          purchase_date: editedDate ? format(editedDate, 'yyyy-MM-dd') : null,
          notes: editedNotes,
          warranty: editedWarranty,
          client_name: editedClient || null,
        })
        .eq("id", receipt.id);
      if (error) {
        throw error;
      }
      // Re-fetch the receipt to update tags and all fields
      await fetchReceipt();
      setIsEditing(false);
      toast({
        title: "Changes saved",
        description: "Receipt details have been updated successfully",
      });
    } catch (error) {
      console.error("Error updating receipt:", error);
      toast({
        title: "Error",
        description: "Failed to update receipt details",
        variant: "destructive",
      });
    }
  };

  const cancelEditing = () => {
    // Reset form values
    setEditedVendor(receipt?.vendor_name || "");
    setEditedAmount(receipt?.total_amount?.toString() || "");
    setEditedNotes(receipt?.notes || "");
    setEditedWarranty(!!receipt?.warranty);
    if (receipt?.purchase_date) {
      setEditedDate(new Date(receipt.purchase_date));
    } else {
      setEditedDate(undefined);
    }
    setIsEditing(false);
  };

  const handleTagAdded = () => {
    // Trigger a refresh of the tag input component
    setTagsRefreshKey(prev => prev + 1);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !receipt) return;
    if (demoPreview && isClientDemoReceiptId(receipt.id)) return;

    try {
      setIsUploadingProductImage(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${receipt.user_id}/${receipt.id}/product.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update receipt with product image path
      const { error: updateError } = await supabase
        .from('receipts')
        .update({ product_image_path: filePath } as Partial<Receipt>)
        .eq('id', receipt.id);

      if (updateError) throw updateError;

      // Update local receipt state without full refresh to preserve edit mode
      if (receipt) {
        setReceipt({ ...receipt, product_image_path: filePath });
      }
      
      // Generate signed URL for the new product image
      const resolved = await resolveReceiptImageUrl(filePath, 60 * 60);
      if (resolved) setProductImageUrl(resolved);
      
      toast({
        title: "Product image uploaded",
        description: "The product image has been added successfully",
      });
    } catch (error) {
      console.error("Error uploading product image:", error);
      toast({
        title: "Error",
        description: "Failed to upload product image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleDeleteProductImage = async () => {
    if (!receipt?.id || !receipt?.product_image_path) return;
    if (demoPreview && isClientDemoReceiptId(receipt.id)) return;
    try {
      const pathToDelete = receipt.product_image_path;
      const { error: storageError } = await supabase.storage
        .from("receipts")
        .remove([pathToDelete]);
      if (storageError) {
        console.warn("Could not remove product image file:", storageError.message);
      }

      const { error: updateError } = await supabase
        .from("receipts")
        .update({ product_image_path: null })
        .eq("id", receipt.id);
      if (updateError) throw updateError;

      setReceipt({ ...receipt, product_image_path: null });
      setProductImageUrl(null);
      toast({
        title: "Product image deleted",
        description: "The product image has been removed.",
      });
    } catch (error) {
      console.error("Error deleting product image:", error);
      toast({
        title: "Error",
        description: "Failed to delete product image.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteProductImageDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Receipt Details</h2>
          <div className="flex flex-row gap-2">
            <Button variant="outline" disabled>Back to Receipts</Button>
            <Button variant="outline" disabled className="flex items-center gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" disabled className="flex items-center gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1">
          <div className="border rounded-lg overflow-hidden shadow-sm print:shadow-none">
            <Skeleton className="w-full aspect-[3/4] bg-gray-100" />
          </div>
          <div className="space-y-4 print:space-y-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-8 w-full mt-3 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-300">Receipt not found</p>
        <Button
          onClick={() =>
            navigate(
              demoPreview && id && isClientDemoReceiptId(id) ? "/dashboard" : "/receipts",
            )
          }
          className="mt-4"
        >
          {demoPreview && id && isClientDemoReceiptId(id) ? "Back to dashboard" : "Back to Receipts"}
        </Button>
      </div>
    );
  }

  const isClientDemoReadOnly =
    demoPreview && !!receipt && isClientDemoReceiptId(receipt.id);

  return (
    <div className="container mx-auto max-w-4xl p-4 text-slate-100">
      <div className="mb-4 md:mb-6">
        <h2 className="text-balance px-2 text-center text-xl font-bold text-white md:text-2xl">
          Receipt Details
        </h2>
        <div
          className={cn(
            "mt-3 w-full max-w-full px-0",
            isMobile
              ? "grid grid-cols-2 gap-2"
              : "flex flex-wrap justify-center gap-2"
          )}
        >
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className={cn(
              "border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white",
              isMobile && "h-9 w-full justify-center text-xs md:text-sm",
              isMobile && isEditing && "col-span-2"
            )}
            onClick={() =>
              navigate(isClientDemoReadOnly ? "/dashboard" : "/receipts")
            }
          >
            {isMobile ? "Back" : isClientDemoReadOnly ? "Back to dashboard" : "Back to Receipts"}
          </Button>
          {!isEditing && (
            <>
              {!isClientDemoReadOnly && (
                <Button 
                  variant="outline" 
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white md:gap-2",
                    isMobile && "h-9 w-full text-xs"
                  )}
                >
                  <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" /> Edit
                </Button>
              )}
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
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
                className={cn(
                  "flex items-center justify-center gap-1.5 border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white md:gap-2",
                  isMobile && "h-9 w-full text-xs"
                )}
              >
                <Printer className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" /> Print
              </Button>
              {!isClientDemoReadOnly && (
                <>
                  <Button
                    variant="outline"
                    size={isMobile ? "sm" : "default"}
                    onClick={openRescanDialog}
                    className={cn(
                      "flex items-center justify-center gap-1.5 border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white md:gap-2",
                      isMobile && "h-9 w-full text-xs leading-tight"
                    )}
                    disabled={isRescanning}
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 shrink-0 md:h-4 md:w-4 ${isRescanning ? "animate-spin" : ""}`} />
                    {isRescanning ? "Working…" : isMobile ? "Rescan AI" : "Rescan with AI"}
                  </Button>
                  <Button
                    variant="destructive"
                    size={isMobile ? "sm" : "default"}
                    onClick={() => setShowDeleteDialog(true)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 md:gap-2",
                      isMobile ? "col-span-2 h-9 w-full text-xs" : ""
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" /> Delete
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-600 shadow-sm print:shadow-none">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Receipt"
              className="h-auto w-full object-contain bg-slate-700 print:max-h-[500px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          
          {/* Product Image in View Mode */}
          {!isEditing && receipt?.warranty && (
            <div className="overflow-hidden rounded-lg border border-slate-600 shadow-sm print:shadow-none">
              <div className="bg-slate-800 p-4">
                <h3 className="text-lg font-semibold mb-2">Product Image</h3>
                {productImageUrl ? (
                  <div className="space-y-4">
                    <img
                      src={productImageUrl}
                      alt="Product"
                      className="h-auto w-full rounded bg-slate-900 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                    {!isClientDemoReadOnly && (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="product-image-reupload-view"
                          className="hidden"
                          accept="image/*"
                          capture={isMobile ? "environment" : undefined}
                          onChange={handleProductImageUpload}
                          disabled={isUploadingProductImage}
                        />
                        <label
                          htmlFor="product-image-reupload-view"
                          className="px-3 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 text-sm"
                        >
                          {isUploadingProductImage ? "Uploading..." : "Replace Image"}
                        </label>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowDeleteProductImageDialog(true)}
                        >
                          Delete Image
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="mb-4 text-slate-300">No product image uploaded</p>
                    {!isClientDemoReadOnly && (
                      <>
                        <input
                          type="file"
                          id="product-image-upload-view"
                          className="hidden"
                          accept="image/*"
                          capture={isMobile ? "environment" : undefined}
                          onChange={handleProductImageUpload}
                          disabled={isUploadingProductImage}
                        />
                        <label
                          htmlFor="product-image-upload-view"
                          className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
                        >
                          {isUploadingProductImage ? "Uploading..." : isMobile ? "Take Product Photo" : "Upload Product Image"}
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 print:space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor" className="text-slate-200">Vendor Name</Label>
                <Input
                  id="vendor"
                  value={editedVendor}
                  onChange={(e) => setEditedVendor(e.target.value)}
                  placeholder="Enter vendor name"
                  className="!border-slate-500 !bg-slate-800 !text-slate-100 [color-scheme:dark] placeholder:!text-slate-400 focus-visible:!ring-orange-400/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-slate-200">Total Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  placeholder="Enter total amount"
                  className="!border-slate-500 !bg-slate-800 !text-slate-100 [color-scheme:dark] placeholder:!text-slate-400 focus-visible:!ring-orange-400/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Purchase Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start border-slate-500 bg-slate-800 text-left font-normal text-slate-100 hover:bg-slate-700 hover:text-white",
                        !editedDate && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedDate ? format(editedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border-slate-600 bg-slate-900 p-0 text-slate-100" align="start">
                    <Calendar
                      mode="single"
                      selected={editedDate}
                      onSelect={setEditedDate}
                      initialFocus
                      className="pointer-events-auto rounded-md bg-slate-950 p-3 text-slate-100"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-200">Notes</Label>
                <textarea
                  id="notes"
                  className="min-h-[60px] w-full rounded-md border border-slate-500 px-3 py-2 text-sm shadow-sm !bg-slate-800 !text-slate-100 [color-scheme:dark] placeholder:!text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                  value={editedNotes}
                  onChange={e => setEditedNotes(e.target.value)}
                  placeholder="Add any notes about this receipt..."
                />
              </div>

              <div className="space-y-1">
                <p className="text-sm text-slate-400 print:text-base print:text-black">Uploaded on</p>
                <p className="font-medium print:text-lg">
                  {receipt.created_at ? format(new Date(receipt.created_at), "PPp") : "Not available"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-slate-400 print:text-base print:text-black">Location</p>
                {receipt.location_name ? (
                  <div className="space-y-2">
                    <p className="font-medium print:text-lg">{receipt.location_name}</p>
                    {receipt.latitude && receipt.longitude && (
                      <>
                        <div className="w-full h-48 rounded-lg overflow-hidden border relative">
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight={0}
                            marginWidth={0}
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${receipt.longitude - 0.01},${receipt.latitude - 0.01},${receipt.longitude + 0.01},${receipt.latitude + 0.01}&layer=mapnik&marker=${receipt.latitude},${receipt.longitude}`}
                            className="no-print pointer-events-none"
                          />
                          {/* Overlay to prevent map dragging but allow clicking to open full map */}
                          <div className="absolute inset-0 cursor-pointer" onClick={() => {
                            window.open(`https://www.openstreetmap.org/?mlat=${receipt.latitude}&mlon=${receipt.longitude}&zoom=15`, '_blank');
                          }} />
                        </div>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${receipt.latitude}&mlon=${receipt.longitude}&zoom=15`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-sky-300 hover:underline"
                        >
                          View on OpenStreetMap
                        </a>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="font-medium print:text-lg">Not available</p>
                )}
              </div>

              <div className="mb-6">
                {isEditing && <TagInput receiptId={receipt.id} onTagsChange={fetchReceipt} />}
              </div>

              <div className="mb-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    id="warranty"
                    type="checkbox"
                    checked={editedWarranty}
                    onChange={(e) => setEditedWarranty(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-400 bg-slate-800 text-orange-600 accent-orange-500 focus-visible:ring-2 focus-visible:ring-orange-400/60"
                  />
                  <label htmlFor="warranty" className="font-medium select-none cursor-pointer text-slate-100">
                    Warranty?
                  </label>
                </div>
                {editedWarranty && !editedDate && (
                  <p className="text-xs text-amber-400/90">Add a purchase date before saving with warranty turned on.</p>
                )}
              </div>

              {/* Product Image Upload - appears right after Warranty checkbox when checked */}
              {editedWarranty && (
                <div className="mb-4 overflow-hidden rounded-lg border border-slate-600 shadow-sm">
                  <div className="bg-slate-800 p-4">
                    <h3 className="text-lg font-semibold mb-2">Product Image</h3>
                    {productImageUrl ? (
                      <div className="space-y-4">
                        <img
                          src={productImageUrl}
                          alt="Product"
                          className="h-auto w-full rounded bg-slate-900 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        <div className="flex gap-2">
                          <input
                            type="file"
                            id="product-image-reupload-edit"
                            className="hidden"
                            accept="image/*"
                            capture={isMobile ? "environment" : undefined}
                            onChange={handleProductImageUpload}
                            disabled={isUploadingProductImage}
                          />
                          <label
                            htmlFor="product-image-reupload-edit"
                            className="px-3 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 text-sm"
                          >
                            {isUploadingProductImage ? "Uploading..." : "Replace Image"}
                          </label>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteProductImageDialog(true)}
                          >
                            Delete Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="mb-3 text-sm text-slate-300">No product image uploaded</p>
                        <div className="flex flex-col items-center gap-2">
                          <input
                            type="file"
                            id="product-image-upload"
                            className="hidden"
                            accept="image/*"
                            capture={isMobile ? "environment" : undefined}
                            onChange={handleProductImageUpload}
                            disabled={isUploadingProductImage}
                          />
                          {isMobile ? (
                            <button
                              type="button"
                              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
                              onClick={() => {
                                const input = document.getElementById('product-image-upload') as HTMLInputElement;
                                if (input) {
                                  input.value = '';
                                  input.click();
                                }
                              }}
                              disabled={isUploadingProductImage}
                            >
                              {isUploadingProductImage ? "Uploading..." : "Take Product Photo"}
                            </button>
                          ) : (
                            <label
                              htmlFor="product-image-upload"
                              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
                            >
                              {isUploadingProductImage ? "Uploading..." : "Upload Product Image"}
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="client" className="text-slate-200">Client</Label>
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <select
                      id="client"
                      className={cn(
                        "w-full cursor-pointer appearance-none rounded-md border border-slate-500 py-2 pl-3 pr-9 text-sm shadow-sm",
                        "focus:outline-none focus:ring-2 focus:ring-orange-400/40",
                        "!bg-slate-800 !text-slate-100 hover:!bg-slate-700"
                      )}
                      value={showNewClientInput ? "__new__" : editedClient}
                      onChange={e => {
                        if (e.target.value === "__new__") {
                          setShowNewClientInput(true);
                          setEditedClient("");
                        } else {
                          setShowNewClientInput(false);
                          setEditedClient(e.target.value);
                        }
                      }}
                    >
                      <option value="">Select client...</option>
                      {allClients.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__new__">Add new client...</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
                      aria-hidden
                    />
                  </div>
                  {showNewClientInput && (
                    <Input
                      className="min-w-0 flex-1 !border-slate-500 !bg-slate-800 !text-slate-100 [color-scheme:dark] placeholder:!text-slate-400"
                      placeholder="Enter new client name"
                      value={editedClient}
                      onChange={e => setEditedClient(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                <Button onClick={handleSaveChanges}>Save Changes</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 print:space-y-6">
              <div className="print:border-b print:pb-4">
                <h3 className="text-xl font-semibold print:text-2xl">{receipt.vendor_name || "Unknown Vendor"}</h3>
                {receipt.client_name && (
                  <div className="mt-1 print:mt-2">
                    <span className="font-medium">Client:</span>
                    <span className="ml-2">{receipt.client_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-medium">Warranty:</span>
                  {receipt.warranty ? (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Yes</span>
                  ) : (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">No</span>
                  )}
                </div>
                {receipt.warranty && (receipt.purchase_date || receipt.warranty_expires_at) && (
                  <div className="mt-1 print:mt-2">
                    <span className="font-medium">Warranty end date:</span>
                    <span className="ml-2">
                      {(() => {
                        const end = warrantyEndFromReceipt(
                          receipt.purchase_date,
                          receipt.warranty_expires_at ?? null,
                          warrantyDefaultMonths,
                        );
                        return end ? format(end, "PPP") : "—";
                      })()}
                    </span>
                    {!receipt.warranty_expires_at && receipt.purchase_date && (
                      <p className="mt-1 text-xs text-slate-400 print:text-[10px] print:text-slate-600">
                        From your profile default: {describeWarrantyMonths(warrantyDefaultMonths)} after the purchase date
                        (adjust in Profile settings).
                      </p>
                    )}
                  </div>
                )}
                {receipt.purchase_date && returnWindowDays > 0 && (
                  <div className="mt-1 print:mt-2">
                    <span className="font-medium">Return reminder:</span>
                    <span className="ml-2">
                      {(() => {
                        const by = suggestedReturnDeadline(receipt.purchase_date, returnWindowDays);
                        return by
                          ? `${format(by, "PPP")} (${returnWindowDays} day${returnWindowDays === 1 ? "" : "s"} after purchase, from Profile)`
                          : "—";
                      })()}
                    </span>
                  </div>
                )}
              </div>

              {receipt.notes && (
                <div className="rounded-md border border-slate-600 bg-slate-800 p-3 print:border print:bg-white print:p-4">
                  <p className="mb-1 text-sm font-medium text-slate-300 print:text-base print:text-black">Notes</p>
                  <p className="whitespace-pre-wrap text-sm print:text-base">{receipt.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 print:grid-cols-3 print:gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-slate-400 print:text-base print:text-black">Date</p>
                  <p className="font-medium print:text-lg">
                    {receipt.purchase_date 
                      ? format(new Date(receipt.purchase_date), "PPP") 
                      : "Not available"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-slate-400 print:text-base print:text-black">Total</p>
                  <p className="font-medium print:text-lg">{formatCurrency(receipt.total_amount, receipt.currency)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-slate-400 print:text-base print:text-black">Uploaded on</p>
                  <p className="font-medium print:text-lg">
                    {receipt.created_at ? format(new Date(receipt.created_at), "PPp") : "Not available"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-slate-400 print:text-base print:text-black">Location</p>
                {receipt.location_name ? (
                  <div className="space-y-2">
                    <p className="font-medium print:text-lg">{receipt.location_name}</p>
                    {receipt.latitude && receipt.longitude && (
                      <>
                        <div className="w-full h-48 rounded-lg overflow-hidden border relative">
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight={0}
                            marginWidth={0}
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${receipt.longitude - 0.01},${receipt.latitude - 0.01},${receipt.longitude + 0.01},${receipt.latitude + 0.01}&layer=mapnik&marker=${receipt.latitude},${receipt.longitude}`}
                            className="no-print pointer-events-none"
                          />
                          {/* Overlay to prevent map dragging but allow clicking to open full map */}
                          <div className="absolute inset-0 cursor-pointer" onClick={() => {
                            window.open(`https://www.openstreetmap.org/?mlat=${receipt.latitude}&mlon=${receipt.longitude}&zoom=15`, '_blank');
                          }} />
                        </div>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${receipt.latitude}&mlon=${receipt.longitude}&zoom=15`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-sky-300 hover:underline"
                        >
                          View on OpenStreetMap
                        </a>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="font-medium print:text-lg">Not available</p>
                )}
              </div>

              <div className="space-y-2 print:space-y-3">
                <p className="text-sm text-slate-400 print:text-base print:text-black">Tags</p>
                <div className="flex flex-wrap gap-2 print:gap-3">
                  {(() => {
                    const seen = new Set<string>();
                    return (receipt.receipt_tags || [])
                      .filter(rt => rt.tags && !seen.has(rt.tags.name.toLowerCase()) && seen.add(rt.tags.name.toLowerCase()))
                      .map(rt => (
                        <span key={rt.tags.id} className={`inline-block px-2 py-1 rounded text-xs print:text-sm print:border ${getTagColor(rt.tags.name)}`}>
                          {rt.tags.name}
                        </span>
                      ));
                  })()}
                </div>
              </div>

              {receipt.line_items && receipt.line_items.length > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm font-medium text-sky-300 hover:text-sky-200"
                    onClick={() => setShowLineItems((v) => !v)}
                  >
                    {showLineItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showLineItems ? "Hide" : "Show"} {receipt.line_items.length} line item{receipt.line_items.length !== 1 ? "s" : ""}
                  </button>
                  {showLineItems && (
                    <div className="divide-y divide-slate-600 rounded-lg border border-slate-600 text-sm">
                      {receipt.line_items.map((item, i) => (
                        <div key={i} className="flex justify-between px-3 py-2 text-slate-200">
                          <span className="truncate pr-4">{item.description}</span>
                          <span className="font-medium whitespace-nowrap">
                            {formatCurrency(item.amount, receipt.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isMobile && (
                <div className="space-y-2 print:space-y-3 no-print">
                  <p className="text-sm text-slate-400 print:text-base print:text-black">Extracted Text</p>
                  <div className="max-h-96 overflow-y-auto rounded-md border border-slate-600 bg-slate-800 p-3 print:border print:bg-white print:p-4 print:max-h-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm print:text-base">
                      {receipt.text_content || "No text extracted"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{receipt?.vendor_name || "this receipt"}</span>
              {receipt?.purchase_date
                ? ` from ${format(new Date(receipt.purchase_date), "PPP")}`
                : ""}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              Yes, delete receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteProductImageDialog}
        onOpenChange={setShowDeleteProductImageDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product image?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product image from this receipt. You can upload a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteProductImage}
            >
              Yes, delete image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRescanDialog} onOpenChange={setShowRescanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rescan this receipt with AI?</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {rescanDialogText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRescanWithAI}>
              Yes, rescan now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print\:grid-cols-1 {
            grid-template-columns: 1fr !important;
          }
          .print\:space-y-6 > * + * {
            margin-top: 0.75rem !important;
          }
          .print\:text-2xl {
            font-size: 1.25rem !important;
            line-height: 1.75rem !important;
          }
          .print\:text-lg {
            font-size: 1rem !important;
            line-height: 1.5rem !important;
          }
          .print\:text-base {
            font-size: 0.875rem !important;
            line-height: 1.25rem !important;
          }
          .print\:text-sm {
            font-size: 0.75rem !important;
            line-height: 1rem !important;
          }
          .print\:gap-6 {
            gap: 0.75rem !important;
          }
          .print\:p-4 {
            padding: 0.5rem !important;
          }
          .print\:pb-4 {
            padding-bottom: 0.5rem !important;
          }
          .print\:border {
            border: 1px solid #e5e7eb !important;
          }
          .print\:border-b {
            border-bottom: 1px solid #e5e7eb !important;
          }
          .print\:bg-white {
            background-color: white !important;
          }
          .print\:text-black {
            color: black !important;
          }
          .print\:shadow-none {
            box-shadow: none !important;
          }
          .print\:max-h-\[500px\] {
            max-height: 200px !important;
          }
          .print\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.5rem !important;
          }
          .print\:gap-3 {
            gap: 0.5rem !important;
          }
          .print\:space-y-3 > * + * {
            margin-top: 0.5rem !important;
          }
          .print\:space-y-2 > * + * {
            margin-top: 0.25rem !important;
          }
          .print\:space-y-1 > * + * {
            margin-top: 0.125rem !important;
          }
          .print\:mt-2 {
            margin-top: 0.25rem !important;
          }
          .print\:mb-1 {
            margin-bottom: 0.125rem !important;
          }
          .print\:mb-6 {
            margin-bottom: 0.75rem !important;
          }
          .print\:pt-4 {
            padding-top: 0.5rem !important;
          }
          .print\:px-2 {
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
          }
          .print\:py-1 {
            padding-top: 0.125rem !important;
            padding-bottom: 0.125rem !important;
          }
          .print\:rounded {
            border-radius: 0.125rem !important;
          }
          .print\:rounded-md {
            border-radius: 0.25rem !important;
          }
          .print\:h-4 {
            height: 0.75rem !important;
          }
          .print\:w-4 {
            width: 0.75rem !important;
          }
          .print\:mr-2 {
            margin-right: 0.25rem !important;
          }
          .print\:gap-2 {
            gap: 0.25rem !important;
          }
          .print\:space-x-2 {
            gap: 0.25rem !important;
          }
          .print\:min-h-\[60px\] {
            min-height: 40px !important;
          }
          .print\:max-h-96 {
            max-height: 150px !important;
          }
          .print\:max-h-none {
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptDetail;
