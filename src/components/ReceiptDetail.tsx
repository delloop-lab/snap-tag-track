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
  receipt_tags: { tag_id: string; tags: { id: string; name: string } }[];
  client_name: string | null;
  type: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  line_items: LineItem[] | null;
  currency: string | null;
};

const ReceiptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
        .eq("user_id", user?.id)
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
      if (data.product_image_path) {
        const resolvedProduct = await resolveReceiptImageUrl(data.product_image_path, 60 * 60 * 24);
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
      navigate("/receipts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
    // Fetch all unique clients for dropdown
    const fetchClients = async () => {
      const { data } = await supabase
        .from("receipts")
        .select("client_name")
        .neq("client_name", null);
      if (data) {
        const uniqueClients = Array.from(new Set(data.map(r => r.client_name).filter(Boolean)));
        setAllClients(uniqueClients);
      }
    };
    fetchClients();
  }, [id, navigate]);

  // Add effect to fetch product image URL when receipt changes
  useEffect(() => {
    const fetchProductImageUrl = async () => {
      if (receipt?.product_image_path) {
        const resolved = await resolveReceiptImageUrl(receipt.product_image_path, 60 * 60);
        setProductImageUrl(resolved);
      } else {
        setProductImageUrl(null);
      }
    };

    fetchProductImageUrl();
  }, [receipt?.product_image_path]);

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
    if (amount === null) return "Not available";
    const code = currencyCode ?? receipt?.currency;
    if (!code) return amount.toFixed(2);
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: code,
      }).format(amount);
    } catch {
      return `${code} ${amount.toFixed(2)}`;
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receipt.id);

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
        <p className="text-muted-foreground">Receipt not found</p>
        <Button onClick={() => navigate("/receipts")} className="mt-4">
          Back to Receipts
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center">Receipt Details</h2>
        <div className="flex justify-center gap-2 mt-2">
          <Button variant="outline" onClick={() => navigate("/receipts")}>Back to Receipts</Button>
          {!isEditing && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                variant="outline"
                onClick={openRescanDialog}
                className="flex items-center gap-2"
                disabled={isRescanning}
              >
                <RefreshCcw className={`h-4 w-4 ${isRescanning ? "animate-spin" : ""}`} />
                {isRescanning ? "Rescanning..." : "Rescan with AI"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1">
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden shadow-sm print:shadow-none">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Receipt"
              className="w-full h-auto object-contain bg-gray-50 print:max-h-[500px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          
          {/* Product Image in View Mode */}
          {!isEditing && receipt?.warranty && (
            <div className="border rounded-lg overflow-hidden shadow-sm print:shadow-none">
              <div className="p-4 bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Product Image</h3>
                {productImageUrl ? (
                  <div className="space-y-4">
                    <img
                      src={productImageUrl}
                      alt="Product"
                      className="w-full h-auto object-contain bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
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
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No product image uploaded</p>
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
                      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 text-sm"
                    >
                      {isUploadingProductImage ? "Uploading..." : isMobile ? "Take Product Photo" : "Upload Product Image"}
                    </label>
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
                <Label htmlFor="vendor">Vendor Name</Label>
                <Input
                  id="vendor"
                  value={editedVendor}
                  onChange={(e) => setEditedVendor(e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  placeholder="Enter total amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedDate ? format(editedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editedDate}
                      onSelect={setEditedDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="border rounded px-2 py-1 w-full min-h-[60px]"
                  value={editedNotes}
                  onChange={e => setEditedNotes(e.target.value)}
                  placeholder="Add any notes about this receipt..."
                />
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground print:text-base print:text-black">Uploaded on</p>
                <p className="font-medium print:text-lg">
                  {receipt.created_at ? format(new Date(receipt.created_at), "PPp") : "Not available"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground print:text-base print:text-black">Location</p>
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
                          className="text-sm text-blue-600 hover:underline"
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

              <div className="flex items-center gap-2 mb-2">
                <input
                  id="warranty"
                  type="checkbox"
                  checked={editedWarranty}
                  onChange={e => setEditedWarranty(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="warranty" className="font-medium select-none cursor-pointer">Warranty?</label>
              </div>

              {/* Product Image Upload - appears right after Warranty checkbox when checked */}
              {editedWarranty && (
                <div className="border rounded-lg overflow-hidden shadow-sm mb-4">
                  <div className="p-4 bg-gray-50">
                    <h3 className="text-lg font-semibold mb-2">Product Image</h3>
                    {productImageUrl ? (
                      <div className="space-y-4">
                        <img
                          src={productImageUrl}
                          alt="Product"
                          className="w-full h-auto object-contain bg-white rounded"
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
                      <div className="text-center py-4">
                        <p className="text-muted-foreground mb-3 text-sm">No product image uploaded</p>
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
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 text-sm"
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
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 text-sm"
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
                <Label htmlFor="client">Client</Label>
                <div className="flex gap-2 items-center">
                  <select
                    id="client"
                    className="border rounded px-2 py-1 flex-1"
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
                  {showNewClientInput && (
                    <Input
                      className="flex-1"
                      placeholder="Enter new client name"
                      value={editedClient}
                      onChange={e => setEditedClient(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSaveChanges}>Save Changes</Button>
                <Button variant="outline" onClick={cancelEditing}>Cancel</Button>
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
                {receipt.warranty && receipt.purchase_date && (
                  <div className="mt-1 print:mt-2">
                    <span className="font-medium">Warranty End Date:</span>
                    <span className="ml-2">
                      {format(new Date(new Date(receipt.purchase_date).setFullYear(new Date(receipt.purchase_date).getFullYear() + 3)), "PPP")}
                    </span>
                  </div>
                )}
              </div>

              {receipt.notes && (
                <div className="bg-muted p-3 rounded-md print:bg-white print:border print:p-4">
                  <p className="text-sm text-muted-foreground mb-1 font-medium print:text-base print:text-black">Notes</p>
                  <p className="whitespace-pre-wrap text-sm print:text-base">{receipt.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 print:grid-cols-3 print:gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground print:text-base print:text-black">Date</p>
                  <p className="font-medium print:text-lg">
                    {receipt.purchase_date 
                      ? format(new Date(receipt.purchase_date), "PPP") 
                      : "Not available"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground print:text-base print:text-black">Total</p>
                  <p className="font-medium print:text-lg">{formatCurrency(receipt.total_amount, receipt.currency)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground print:text-base print:text-black">Uploaded on</p>
                  <p className="font-medium print:text-lg">
                    {receipt.created_at ? format(new Date(receipt.created_at), "PPp") : "Not available"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground print:text-base print:text-black">Location</p>
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
                          className="text-sm text-blue-600 hover:underline"
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
                <p className="text-sm text-muted-foreground print:text-base print:text-black">Tags</p>
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
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    onClick={() => setShowLineItems((v) => !v)}
                  >
                    {showLineItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showLineItems ? "Hide" : "Show"} {receipt.line_items.length} line item{receipt.line_items.length !== 1 ? "s" : ""}
                  </button>
                  {showLineItems && (
                    <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 text-sm">
                      {receipt.line_items.map((item, i) => (
                        <div key={i} className="flex justify-between px-3 py-2 text-gray-700">
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
                  <p className="text-sm text-muted-foreground print:text-base print:text-black">Extracted Text</p>
                  <div className="bg-muted p-3 rounded-md max-h-96 overflow-y-auto print:bg-white print:border print:p-4 print:max-h-none">
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
