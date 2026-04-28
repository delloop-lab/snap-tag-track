import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Progress } from "@/components/ui/progress";
import { Camera } from "lucide-react";
import exifr from "exifr";
import ReceiptReview from "./ReceiptReview";

const FAKE_CLIENTS = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Umbrella Co.",
  "Wayne Enterprises",
  "Stark Industries",
];

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const sub = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + sub
      );
    }
  }
  return matrix[b.length][a.length];
}

async function findSimilarVendor(
  vendorName: string,
  userId: string
): Promise<{ vendorName: string | null; tags: { id: string; name: string }[] }> {
  if (!vendorName) return { vendorName: null, tags: [] };
  try {
    const { data, error } = await supabase
      .from("receipts")
      .select("vendor_name, receipt_tags(tags:tag_id(id, name))")
      .eq("user_id", userId)
      .not("vendor_name", "is", null);

    if (error || !data?.length) return { vendorName: null, tags: [] };

    const normalize = (s: string) =>
      s.toLowerCase().trim().replace(/[^\w\s]/g, "");
    const normalizedNew = normalize(vendorName);

    let best = {
      similarity: 0,
      vendorName: null as string | null,
      tags: [] as { id: string; name: string }[],
    };

    for (const receipt of data) {
      if (!receipt.vendor_name) continue;
      const normalizedPrev = normalize(receipt.vendor_name);
      const maxLen = Math.max(normalizedNew.length, normalizedPrev.length);
      if (maxLen === 0) continue;
      const similarity = 1 - levenshteinDistance(normalizedNew, normalizedPrev) / maxLen;
      if (similarity > 0.7 && similarity > best.similarity) {
        best = {
          similarity,
          vendorName: receipt.vendor_name,
          tags: (receipt.receipt_tags as any[])
            ?.map((rt) => rt.tags)
            .filter(Boolean) ?? [],
        };
      }
    }

    return { vendorName: best.vendorName, tags: best.tags };
  } catch {
    return { vendorName: null, tags: [] };
  }
}

type Stage = "idle" | "processing" | "review" | "saving";

interface ReviewState {
  filePath: string;
  rawText: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  suggestedTags: { id: string; name: string }[];
  vendor: string;
  amount: string;
  date: string;
  currency: string;
  confidence: "high" | "medium" | "low";
  lineItems: { description: string; amount: number }[];
}

const ReceiptUpload = () => {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [receiptType, setReceiptType] = useState("Personal");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [warranty, setWarranty] = useState(false);
  const [nonImageWarning, setNonImageWarning] = useState("");
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768
    );
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768
      );
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const extractLocationFromExif = async (
    file: File
  ): Promise<{
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
  }> => {
    try {
      const exifData = await exifr.parse(file, { gps: true });
      const lat = exifData?.latitude ?? null;
      const lon = exifData?.longitude ?? null;

      if (lat && lon) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          return {
            latitude: lat,
            longitude: lon,
            locationName: data.display_name ?? null,
          };
        } catch {
          return { latitude: lat, longitude: lon, locationName: null };
        }
      }

      // Browser geolocation fallback
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
              })
          );
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await res.json();
            return {
              latitude,
              longitude,
              locationName: data.display_name ?? null,
            };
          } catch {
            return { latitude, longitude, locationName: null };
          }
        } catch {
          // geolocation denied or timed out
        }
      }
    } catch {
      // EXIF parsing failed — not critical
    }
    return { latitude: null, longitude: null, locationName: null };
  };

  const processAndExtract = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload receipts.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setStage("processing");
    setProgress(10);
    setProgressLabel("Uploading receipt...");
    setNonImageWarning("");

    try {
      const { latitude, longitude, locationName } =
        await extractLocationFromExif(file);

      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;

      const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error("File cannot be read"));
        reader.readAsArrayBuffer(file);
      });

      const blob = new Blob([fileBuffer], { type: file.type });

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, blob);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(40);
      setProgressLabel("Analyzing with AI...");

      const { data: fnData, error: fnError } =
        await supabase.functions.invoke("process-receipt", {
          body: { filePath: fileName },
        });

      if (fnError) {
        throw new Error(`AI processing failed: ${fnError.message}`);
      }
      if (!fnData?.success) {
        throw new Error(fnData?.error ?? "AI processing returned no result");
      }

      const extracted = fnData.data;

      setProgress(85);
      setProgressLabel("Finalizing...");

      const vendorFromAI: string = extracted.vendor ?? "Unknown Vendor";
      const { vendorName: matchedVendor, tags: suggestedTags } =
        await findSimilarVendor(vendorFromAI, user.id);

      setReviewState({
        filePath: fileName,
        rawText: extracted.raw_text ?? null,
        latitude,
        longitude,
        locationName,
        suggestedTags,
        vendor: matchedVendor ?? vendorFromAI,
        amount:
          extracted.total_amount != null ? String(extracted.total_amount) : "",
        date: extracted.purchase_date ?? "",
        currency: extracted.currency ?? "GBP",
        confidence: extracted.confidence ?? "medium",
        lineItems: extracted.line_items ?? [],
      });

      setProgress(100);
      setStage("review");
    } catch (error) {
      console.error("processAndExtract error:", error);
      toast({
        title: "Processing failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setStage("idle");
      setProgress(0);
    }
  };

  const confirmAndSave = async (tagNow: boolean) => {
    if (!reviewState || !user) return;
    setStage("saving");

    try {
      const totalAmount = reviewState.amount
        ? parseFloat(reviewState.amount)
        : null;

      const { data: insertData, error: insertError } = await supabase
        .from("receipts")
        .insert({
          user_id: user.id,
          image_path: reviewState.filePath,
          text_content: reviewState.rawText,
          vendor_name: reviewState.vendor || "Unknown Vendor",
          total_amount: totalAmount != null && !isNaN(totalAmount) ? totalAmount : null,
          purchase_date: reviewState.date || null,
          type: receiptType,
          client_name: receiptType === "Business" ? clientName : null,
          notes: notes || null,
          warranty,
          file_type: "image/jpeg",
          latitude: reviewState.latitude,
          longitude: reviewState.longitude,
          location_name: reviewState.locationName,
          line_items: reviewState.lineItems.length > 0 ? reviewState.lineItems : null,
        })
        .select();

      if (insertError) throw new Error(insertError.message);

      const receiptId = insertData?.[0]?.id;
      if (!receiptId) throw new Error("No receipt ID returned");

      if (reviewState.suggestedTags.length > 0) {
        await supabase.from("receipt_tags").insert(
          reviewState.suggestedTags.map((tag) => ({
            receipt_id: receiptId,
            tag_id: tag.id,
          }))
        );
        toast({
          title: "Tags copied",
          description: `Copied ${reviewState.suggestedTags.length} tag${reviewState.suggestedTags.length !== 1 ? "s" : ""} from a similar receipt`,
        });
      }

      if (productImageFile) {
        const ext = productImageFile.name.split(".").pop();
        const productImagePath = `${user.id}/${receiptId}/product.${ext}`;
        const { error: productUploadError } = await supabase.storage
          .from("receipts")
          .upload(productImagePath, productImageFile);
        if (!productUploadError) {
          await supabase
            .from("receipts")
            .update({ product_image_path: productImagePath })
            .eq("id", receiptId);
        }
      }

      window.dispatchEvent(new CustomEvent("receiptAdded"));
      toast({ title: "Receipt saved", description: "Your receipt has been processed." });

      setReviewState(null);
      setStage("idle");
      setProgress(0);

      if (tagNow) {
        navigate(`/receipt/${receiptId}`);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("confirmAndSave error:", error);
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setStage("review");
    }
  };

  const handleRescan = () => {
    setReviewState(null);
    setStage("idle");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/") || file.type === "" || file.name.match(/\.(jpe?g|png|heic|heif|webp)$/i);

    if (!isImage && !isPdf) {
      toast({
        title: "Invalid file type",
        description: "Please upload a photo of your receipt.",
        variant: "destructive",
      });
      return;
    }

    if (isPdf) {
      setNonImageWarning(
        "PDF files cannot be analyzed with AI. Please upload a photo of your receipt."
      );
      return;
    }

    processAndExtract(file);
  };

  const isProcessing = stage === "processing";
  const isSaving = stage === "saving";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-2xl font-bold mb-4">
        {isMobile ? "New Receipt" : "Upload Receipt"}
      </h2>

      {/* Receipt type */}
      <div className="w-full max-w-md mb-4">
        <label className="block mb-2 font-medium">Type</label>
        <select
          className="border rounded px-2 py-1 w-full"
          value={receiptType}
          onChange={(e) => setReceiptType(e.target.value)}
          disabled={isProcessing || isSaving}
        >
          <option value="Personal">Personal</option>
          <option value="Business">Business</option>
        </select>
      </div>

      {receiptType === "Business" && (
        <div className="w-full max-w-md mb-4">
          <label className="block mb-2 font-medium">Client Name</label>
          <div className="flex gap-2">
            <select
              className="border rounded px-2 py-1 flex-1"
              value={clientName}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewClientInput(true);
                  setClientName("");
                } else {
                  setShowNewClientInput(false);
                  setClientName(e.target.value);
                }
              }}
              disabled={isProcessing || isSaving}
            >
              <option value="">Select client...</option>
              {FAKE_CLIENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__new__">Add new client...</option>
            </select>
            {showNewClientInput && (
              <input
                type="text"
                className="border rounded px-2 py-1 flex-1"
                placeholder="Enter new client name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-md mb-4">
        <label className="block mb-2 font-medium" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          className="border rounded px-2 py-1 w-full min-h-[60px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this receipt..."
          disabled={isProcessing || isSaving}
        />
      </div>

      <div className="w-full max-w-md mb-4 flex items-center gap-2">
        <input
          id="warranty"
          type="checkbox"
          checked={warranty}
          onChange={(e) => setWarranty(e.target.checked)}
          className="h-4 w-4"
          disabled={isProcessing || isSaving}
        />
        <label htmlFor="warranty" className="font-medium select-none cursor-pointer">
          Warranty?
        </label>
      </div>

      {warranty && (
        <div className="w-full max-w-md mb-4 p-4 border rounded-lg bg-gray-50">
          <label className="block mb-2 font-medium">Product Image (Optional)</label>
          <p className="text-sm text-gray-600 mb-3">
            Take a photo of the product for warranty reference
          </p>
          {productImagePreview ? (
            <div className="mb-3">
              <img
                src={productImagePreview}
                alt="Product preview"
                className="w-full h-32 object-contain bg-white rounded border"
              />
              <button
                type="button"
                onClick={() => {
                  setProductImageFile(null);
                  setProductImagePreview(null);
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-700"
                disabled={isProcessing || isSaving}
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <input
                ref={productImageInputRef}
                id="product-image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                capture={isMobile ? "environment" : undefined}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setProductImageFile(f);
                    const reader = new FileReader();
                    reader.onloadend = () =>
                      setProductImagePreview(reader.result as string);
                    reader.readAsDataURL(f);
                  }
                }}
                disabled={isProcessing || isSaving}
              />
              <label
                htmlFor="product-image-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                {isMobile ? "Take Product Photo" : "Upload Product Image"}
              </label>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        id="receipt-upload"
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/heic,application/pdf"
        capture={isMobile ? "environment" : undefined}
        onChange={handleFileChange}
        disabled={isProcessing || isSaving}
      />

      {!isMobile && (
        <div className="w-full max-w-md">
          <label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG or HEIC (max 10MB)
              </p>
            </div>
          </label>
        </div>
      )}

      {isProcessing && (
        <div className="w-full max-w-md">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
      )}

      {nonImageWarning && (
        <div className="w-full max-w-md p-3 bg-red-100 text-red-700 rounded border border-red-300 text-center text-sm">
          {nonImageWarning}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {!isMobile && (
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              disabled={isProcessing || isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => document.getElementById("receipt-upload")?.click()}
              disabled={isProcessing || isSaving}
            >
              {isProcessing ? progressLabel : "Upload Receipt"}
            </Button>
          </>
        )}
        {isMobile && (
          <div className="w-full flex flex-col items-center" style={{ maxWidth: 340 }}>
            <button
              type="button"
              className="bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold py-5 px-6 rounded-full w-full shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-center gap-2 disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isSaving}
            >
              <Camera className="w-6 h-6 -ml-1" />
              {isProcessing ? progressLabel : "SNAP RECEIPT"}
            </button>
            <button
              type="button"
              className="border border-orange-400 text-orange-500 font-semibold rounded-full w-full py-3 mt-2 transition-all duration-150 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-200"
              onClick={() => navigate("/")}
              disabled={isProcessing || isSaving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {reviewState && (
        <ReceiptReview
          open={stage === "review" || stage === "saving"}
          vendor={reviewState.vendor}
          amount={reviewState.amount}
          date={reviewState.date}
          currency={reviewState.currency}
          confidence={reviewState.confidence}
          lineItems={reviewState.lineItems}
          onVendorChange={(v) =>
            setReviewState((s) => (s ? { ...s, vendor: v } : s))
          }
          onAmountChange={(v) =>
            setReviewState((s) => (s ? { ...s, amount: v } : s))
          }
          onDateChange={(v) =>
            setReviewState((s) => (s ? { ...s, date: v } : s))
          }
          onConfirm={confirmAndSave}
          onRescan={handleRescan}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default ReceiptUpload;
