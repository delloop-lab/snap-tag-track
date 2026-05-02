import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Images } from "lucide-react";
import exifr from "exifr";
import ReceiptReview from "./ReceiptReview";
import { siblingThumbStorageKey } from "@/lib/siblingThumbPath";
import { createThumbnailJpeg } from "@/lib/imageThumbnail";
import { validateWarrantyWithPurchaseDate } from "@/lib/warrantyRules";

/** Keep in sync with Profile `RECEIPT_LOCATION_PREF_EVENT`. */
const SNAP_RECEIPT_LOCATION_PREF_EVENT = "snap:receipt-location-pref-changed";

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
  fileType: string;
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

/**
 * Resize and re-encode an image to JPEG before upload.
 * - Caps the longest side at `maxPx` (default 1920 — enough for GPT-4o vision detail)
 * - Quality 0.88 keeps text sharp while cutting file size 60–85 %
 * - Returns the original file unchanged if it's already small or if the
 *   browser can't draw it (e.g. some HEIC on Android)
 */
async function compressImage(
  file: File,
  maxPx = 1920,
  quality = 0.88
): Promise<{ blob: Blob; ext: string; contentType: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxPx / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        const fallbackExt = file.name.split(".").pop() || "jpg";
        resolve({
          blob: file,
          ext: fallbackExt,
          contentType: file.type || "application/octet-stream",
        });
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, ext: "jpg", contentType: "image/jpeg" });
          } else {
            const fallbackExt = file.name.split(".").pop() || "jpg";
            resolve({
              blob: file,
              ext: fallbackExt,
              contentType: file.type || "application/octet-stream",
            });
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const fallbackExt = file.name.split(".").pop() || "jpg";
      resolve({
        blob: file,
        ext: fallbackExt,
        contentType: file.type || "application/octet-stream",
      });
    };

    img.src = url;
  });
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
  const mobileGalleryInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  /** In-app camera — avoids broken Android `<input capture>` → no `change` event. */
  const inlineVideoRef = useRef<HTMLVideoElement>(null);
  const inlineStreamRef = useRef<MediaStream | null>(null);

  const [inlineCameraOpen, setInlineCameraOpen] = useState(false);
  const [inlineCameraStarting, setInlineCameraStarting] = useState(false);
  const [locationPrefModalOpen, setLocationPrefModalOpen] = useState(false);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(
    null
  );
  const navigate = useNavigate();
  const { user } = useAuth();

  const [receiptLocationDisabledPref, setReceiptLocationDisabledPref] =
    useState(false);
  const [receiptLocationPrefReady, setReceiptLocationPrefReady] =
    useState(false);

  const refreshReceiptLocationPref = useCallback(async () => {
    if (!user?.id) {
      setReceiptLocationDisabledPref(false);
      setReceiptLocationPrefReady(true);
      return;
    }
    setReceiptLocationPrefReady(false);
    const { data, error } = await supabase
      .from("users")
      .select("receipt_location_disabled")
      .eq("id", user.id)
      .maybeSingle();
    if (!error && data?.receipt_location_disabled === true) {
      setReceiptLocationDisabledPref(true);
    } else {
      setReceiptLocationDisabledPref(false);
    }
    setReceiptLocationPrefReady(true);
  }, [user?.id]);

  React.useEffect(() => {
    void refreshReceiptLocationPref();
  }, [refreshReceiptLocationPref]);

  React.useEffect(() => {
    const onChanged = () => void refreshReceiptLocationPref();
    window.addEventListener(SNAP_RECEIPT_LOCATION_PREF_EVENT, onChanged);
    return () =>
      window.removeEventListener(SNAP_RECEIPT_LOCATION_PREF_EVENT, onChanged);
  }, [refreshReceiptLocationPref]);

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

  const stopInlineCamera = () => {
    if (inlineVideoRef.current) inlineVideoRef.current.srcObject = null;
    inlineStreamRef.current?.getTracks().forEach((t) => t.stop());
    inlineStreamRef.current = null;
  };

  React.useEffect(() => {
    if (!inlineCameraOpen || !isMobile) return;

    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      setInlineCameraStarting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        inlineStreamRef.current = stream;
        const vid = inlineVideoRef.current;
        if (vid) {
          vid.srcObject = stream;
          await vid.play().catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Could not access the camera.";
          toast({
            title: "Camera unavailable",
            description: `${msg} Try “Choose from gallery” instead.`,
            variant: "destructive",
          });
          setInlineCameraOpen(false);
        }
      } finally {
        if (!cancelled) setInlineCameraStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopInlineCamera();
    };
  }, [inlineCameraOpen, isMobile]);

  const openInlineReceiptCamera = () => {
    if (isProcessing || isSaving || (Boolean(user?.id) && !receiptLocationPrefReady))
      return;
    /** Browsers only expose the camera on a "secure" URL. `http://localhost` is ok; `http://192.168…` is not. */
    const canUseCamera = Boolean(navigator.mediaDevices?.getUserMedia);
    if (!canUseCamera) {
      toast({
        title: "Camera needs a secure URL",
        description: window.isSecureContext
          ? "Allow camera for this site or use “Choose from gallery”."
          : "Plain http:// URLs (except localhost) cannot use the camera. Restart dev with HTTPS (vite now uses it—you should see https:// in the terminal) and open that link from your phone, or use Choose from gallery.",
        variant: "destructive",
      });
      return;
    }
    setInlineCameraOpen(true);
  };

  const captureReceiptFromInlineCamera = () => {
    const video = inlineVideoRef.current;
    if (!video || video.videoWidth < 2 || video.videoHeight < 2) {
      toast({
        title: "Camera not ready",
        description: "Wait for the preview, then tap Capture again.",
        variant: "destructive",
      });
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast({
        title: "Could not capture",
        description: "Your browser blocked drawing the camera frame.",
        variant: "destructive",
      });
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        stopInlineCamera();
        setInlineCameraOpen(false);
        if (!blob) {
          toast({
            title: "Could not encode photo",
            description: "Try again or pick from gallery.",
            variant: "destructive",
          });
          return;
        }
        const file = new File([blob], `receipt-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        enqueueReceiptForLocationChoice(file);
      },
      "image/jpeg",
      0.92
    );
  };

  const extractLocationFromExif = async (
    file: File,
    includeLocation: boolean
  ): Promise<{
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
  }> => {
    if (!includeLocation) {
      return { latitude: null, longitude: null, locationName: null };
    }

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

  const confirmLocationPreference = (includeLocation: boolean) => {
    const file = pendingReceiptFile;
    if (!file) return;
    setPendingReceiptFile(null);
    setLocationPrefModalOpen(false);
    void processAndExtract(file, includeLocation).finally(() => {
      queueMicrotask(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (mobileGalleryInputRef.current) mobileGalleryInputRef.current.value = "";
      });
    });
  };

  const dismissLocationPreference = () => {
    setPendingReceiptFile(null);
    setLocationPrefModalOpen(false);
    queueMicrotask(() => {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (mobileGalleryInputRef.current) mobileGalleryInputRef.current.value = "";
    });
  };

  const enqueueReceiptForLocationChoice = (file: File) => {
    if (pendingReceiptFile || stage === "processing" || stage === "saving") return;
    if (receiptLocationDisabledPref) {
      void processAndExtract(file, false).finally(() => {
        queueMicrotask(() => {
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (mobileGalleryInputRef.current)
            mobileGalleryInputRef.current.value = "";
        });
      });
      return;
    }
    setPendingReceiptFile(file);
    setLocationPrefModalOpen(true);
  };

  const processAndExtract = async (file: File, includeLocation: boolean) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload receipts.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 30 MB. Please use a smaller image.",
        variant: "destructive",
      });
      return;
    }

    setStage("processing");
    setProgress(5);
    setProgressLabel("Preparing image...");
    setNonImageWarning("");

    try {
      // Extract GPS from the original file BEFORE compression (canvas strips EXIF)
      const { latitude, longitude, locationName } =
        await extractLocationFromExif(file, includeLocation);

      setProgress(15);
      setProgressLabel("Optimising image...");

      // Compress: resize to max 1920 px, re-encode as JPEG
      const { blob: compressedBlob, ext, contentType } = await compressImage(file);

      const fileName = `${uuidv4()}.${ext}`;

      setProgress(25);
      setProgressLabel("Uploading receipt...");

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, compressedBlob, { contentType });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Never fail the whole upload if thumbnail generation doesn't support source format (e.g. HEIC).
      try {
        const thumbBlob = await createThumbnailJpeg(compressedBlob);
        if (thumbBlob) {
          const thumbName = siblingThumbStorageKey(fileName);
          const { error: thumbErr } = await supabase.storage
            .from("receipts")
            .upload(thumbName, thumbBlob, { contentType: "image/jpeg", upsert: true });
          if (thumbErr) {
            console.warn("Thumbnail upload failed (list may use full image):", thumbErr.message);
          }
        }
      } catch (thumbError) {
        console.warn("Thumbnail generation skipped for this image:", thumbError);
      }

      setProgress(45);
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

      const extracted = fnData.data ?? {};

      setProgress(85);
      setProgressLabel("Finalizing...");

      const vendorFromAI: string = extracted.vendor ?? "Unknown Vendor";
      const { vendorName: matchedVendor, tags: suggestedTags } =
        await findSimilarVendor(vendorFromAI, user.id);

      setReviewState({
        filePath: fileName,
        fileType: contentType || "application/octet-stream",
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
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Processing failed",
        description: message,
        variant: "destructive",
      });
      setNonImageWarning(`Processing failed: ${message}`);
      setStage("idle");
      setProgress(0);
    }
  };

  const confirmAndSave = async (tagNow: boolean) => {
    if (!reviewState || !user) return;
    const warrantyDateErr = validateWarrantyWithPurchaseDate(warranty, reviewState.date);
    if (warrantyDateErr) {
      toast({ title: "Purchase date needed", description: warrantyDateErr, variant: "destructive" });
      setStage("review");
      return;
    }
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
          file_type: reviewState.fileType || "application/octet-stream",
          latitude: reviewState.latitude,
          longitude: reviewState.longitude,
          location_name: reviewState.locationName,
          line_items: reviewState.lineItems.length > 0 ? reviewState.lineItems : null,
          currency: reviewState.currency || null,
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
      toast({
        title: "Receipt saved",
        description: tagNow ? (
          "Your receipt has been processed."
        ) : (
          <span>
            Your receipt has been processed.
            <button
              type="button"
              className="ml-2 underline font-semibold"
              onClick={() => navigate(`/receipt/${receiptId}`)}
            >
              Tag now
            </button>
          </span>
        ),
      });

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

  const clearReceiptFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (mobileGalleryInputRef.current) mobileGalleryInputRef.current.value = "";
  };

  const handleRescan = () => {
    setReviewState(null);
    setStage("idle");
    setProgress(0);
    clearReceiptFileInputs();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setNonImageWarning("");

    const isPdf = file.type === "application/pdf";
    const isImage =
      file.type.startsWith("image/") ||
      file.type === "" ||
      file.name.match(/\.(jpe?g|png|heic|heif|webp)$/i);

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

    enqueueReceiptForLocationChoice(file);
  };

  const isProcessing = stage === "processing";
  const isSaving = stage === "saving";
  const receiptPrefsBlockingCapture =
    Boolean(user?.id) && !receiptLocationPrefReady;
  const receiptCaptureBlocked =
    isProcessing || isSaving || receiptPrefsBlockingCapture;
  const receiptInputAccept = isMobile ? "image/*" : "image/*,application/pdf";
  const productInputAccept = "image/*";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 text-slate-100 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-600 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-6">
        <div className="mb-6 text-center">
          <p className="mb-2 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
            Quick capture
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {isMobile ? "New Receipt" : "Upload Receipt"}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Snap or upload a receipt, then review AI extraction before saving.
          </p>
          {receiptPrefsBlockingCapture && (
            <p className="mt-1 text-xs text-slate-500" role="status">
              Loading capture preferences…
            </p>
          )}
        </div>

      {/* Receipt type */}
      <div className="mb-4 w-full">
        <label className="mb-2 block font-medium text-slate-200">Type</label>
        <select
          className="h-11 w-full rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-slate-100"
          value={receiptType}
          onChange={(e) => setReceiptType(e.target.value)}
          disabled={isProcessing || isSaving}
        >
          <option value="Personal">Personal</option>
          <option value="Business">Business</option>
        </select>
      </div>

      {receiptType === "Business" && (
        <div className="mb-4 w-full">
          <label className="mb-2 block font-medium text-slate-200">Client Name</label>
          <div className="flex gap-2">
            <select
              className="h-11 flex-1 rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-slate-100"
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
                className="h-11 flex-1 rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-400"
                placeholder="Enter new client name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      <div className="mb-4 w-full">
        <label className="mb-2 block font-medium text-slate-200" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          className="min-h-[84px] w-full rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-400"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this receipt..."
          disabled={isProcessing || isSaving}
        />
      </div>

      <div className="mb-4 flex w-full flex-col gap-1 rounded-md border border-slate-600 bg-slate-800/60 px-3 py-2">
        <div className="flex items-center gap-2">
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
        {warranty && reviewState && !reviewState.date?.trim() && (
          <p className="pl-6 text-xs text-slate-400">Set a purchase date in the review step to track warranty.</p>
        )}
      </div>

      {warranty && (
        <div className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-800/70 p-4">
          <label className="mb-2 block font-medium text-slate-100">Product Image (Optional)</label>
          <p className="mb-3 text-sm text-slate-300">
            Take a photo of the product for warranty reference
          </p>
          {productImagePreview ? (
            <div className="mb-3">
              <img
                src={productImagePreview}
                alt="Product preview"
                className="h-32 w-full rounded border border-slate-500 bg-slate-900 object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setProductImageFile(null);
                  setProductImagePreview(null);
                }}
                className="mt-2 text-sm text-red-300 hover:text-red-200"
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
                accept={productInputAccept}
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
                className="inline-flex cursor-pointer items-center rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                {isMobile ? "Take Product Photo" : "Upload Product Image"}
              </label>
            </>
          )}
        </div>
      )}

      {isMobile ? (
        <input
          ref={mobileGalleryInputRef}
          id="receipt-upload-gallery"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={receiptCaptureBlocked}
        />
      ) : (
        <input
          ref={fileInputRef}
          id="receipt-upload"
          type="file"
          className="hidden"
          accept={receiptInputAccept}
          onChange={handleFileChange}
          disabled={receiptCaptureBlocked}
        />
      )}

      {!isMobile && (
        <div className="w-full">
          <label
            htmlFor="receipt-upload"
            className={`flex h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-500 bg-slate-800/70 transition-colors hover:bg-slate-800 ${receiptCaptureBlocked ? "pointer-events-none cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="mb-2 text-sm text-slate-300">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-slate-400">
                JPEG, PNG, HEIC or WEBP — auto-optimised before upload
              </p>
            </div>
          </label>
        </div>
      )}

      {isProcessing && (
        <div className="w-full">
          <div className="mb-2 flex justify-between text-sm text-slate-300">
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
      )}

      {nonImageWarning && (
        <div className="w-full rounded-md border border-red-500/60 bg-red-950/40 p-3 text-center text-sm text-red-200">
          {nonImageWarning}
        </div>
      )}

      <div className="mt-5 flex gap-2">
        {!isMobile && (
          <>
            <Button
              variant="outline"
              className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
              onClick={() => navigate("/")}
              disabled={isProcessing || isSaving}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              asChild
              disabled={receiptCaptureBlocked}
            >
              <label htmlFor="receipt-upload" className="cursor-pointer">
                {isProcessing ? progressLabel : "Upload Receipt"}
              </label>
            </Button>
          </>
        )}
        {isMobile && (
          <div className="flex w-full flex-col items-center" style={{ maxWidth: 340 }}>
            <button
              type="button"
              onClick={openInlineReceiptCamera}
              className={`bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold py-5 px-6 rounded-full w-full shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-center gap-2 ${receiptCaptureBlocked ? "pointer-events-none opacity-60" : ""}`}
            >
              <Camera className="w-6 h-6 -ml-1 shrink-0" aria-hidden />
              {isProcessing ? progressLabel : "SNAP RECEIPT"}
            </button>
            <label
              htmlFor="receipt-upload-gallery"
              className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-500 bg-slate-800/80 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 ${receiptCaptureBlocked ? "pointer-events-none opacity-60" : ""}`}
            >
              <Images className="h-5 w-5 text-slate-300" aria-hidden />
              Choose from gallery
            </label>
            <button
              type="button"
              className="mt-2 w-full rounded-full border border-orange-400 bg-transparent py-3 font-semibold text-orange-300 transition-all duration-150 hover:bg-orange-500/10 focus:outline-none focus:ring-2 focus:ring-orange-300/50"
              onClick={() => navigate("/")}
              disabled={isProcessing || isSaving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      </div>

      <Dialog
        open={inlineCameraOpen && isMobile}
        onOpenChange={(open) => {
          if (!open) {
            stopInlineCamera();
          }
          setInlineCameraOpen(open);
        }}
      >
        <DialogContent className="max-h-[min(90vh,640px)] w-[min(calc(100vw-2rem),28rem)] border-slate-600 bg-slate-900 p-4 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white">Scan receipt</DialogTitle>
            <DialogDescription className="text-slate-300">
              Hold the receipt flat in frame, tap Capture — then AI will analyse it like a gallery photo.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={inlineVideoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
              aria-label="Live camera preview for receipt capture"
            />
            {inlineCameraStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-slate-200">
                Starting camera…
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 flex-row flex-wrap gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700"
              onClick={() => setInlineCameraOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              onClick={captureReceiptFromInlineCamera}
              disabled={inlineCameraStarting || isProcessing}
            >
              Capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={locationPrefModalOpen}
        onOpenChange={(open) => {
          if (!open) dismissLocationPreference();
        }}
      >
        <DialogContent className="w-[min(calc(100vw-2rem),28rem)] border-slate-600 bg-slate-900 p-4 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white">
              Attach location to this receipt?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  If you choose to attach location, we may use GPS embedded in the
                  photo (when available) or ask your browser for{" "}
                  <strong className="font-semibold text-slate-200">
                    this device&apos;s
                  </strong>{" "}
                  current position — then convert it to a place name.
                </p>
                <p>
                  That may not match the shop (for example if you scan at home or
                  your photo was taken somewhere else). If you want the receipt
                  without a place, choose{" "}
                  <span className="font-medium text-slate-200">
                    Don&apos;t attach location
                  </span>
                  .
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              className="w-full bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => confirmLocationPreference(true)}
            >
              Include location
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700"
              onClick={() => confirmLocationPreference(false)}
            >
              Don&apos;t attach location
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              onClick={dismissLocationPreference}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          onClose={handleRescan}
          onRescan={handleRescan}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default ReceiptUpload;
