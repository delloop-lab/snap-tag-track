import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createWorker } from "tesseract.js";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tag, Clock, Camera } from "lucide-react";
import exifr from 'exifr';

// Add this at the top of the file for TypeScript to recognize cv as a global
// @ts-ignore
declare global {
  interface Window { cv: any; }
}

const FAKE_CLIENTS = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Umbrella Co.",
  "Wayne Enterprises",
  "Stark Industries"
];

// Add Levenshtein distance function for text similarity
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// Function to find similar receipts and suggest vendor name
async function findSimilarReceipt(textContent: string, userId: string): Promise<{ vendorName: string | null, tags: { id: string, name: string }[] }> {
  try {
    console.log("Searching for similar receipts for user:", userId);
    // Get all previous receipts for the user with their tags
    const { data: previousReceipts, error } = await supabase
      .from("receipts")
      .select(`
        text_content,
        vendor_name,
        receipt_tags(
          tags:tag_id(
            id,
            name
          )
        )
      `)
      .eq("user_id", userId)
      .not("vendor_name", "is", null);

    if (error) {
      console.error("Error fetching receipts:", error);
      throw error;
    }
    if (!previousReceipts || previousReceipts.length === 0) {
      console.log("No previous receipts found for user");
      return { vendorName: null, tags: [] };
    }

    console.log("Found", previousReceipts.length, "previous receipts");
    console.log("Previous receipts:", previousReceipts);

    // Get the first few lines of the new receipt's text
    const newReceiptLines = textContent.split('\n').slice(0, 3).join('\n').toLowerCase();
    console.log("New receipt first 3 lines:", newReceiptLines);
    
    let bestMatch = {
      similarity: 0,
      vendorName: null as string | null,
      tags: [] as { id: string, name: string }[]
    };

    // Compare with each previous receipt
    for (const receipt of previousReceipts) {
      if (!receipt.text_content) {
        console.log("Skipping receipt with no text content");
        continue;
      }
      
      const prevReceiptLines = receipt.text_content.split('\n').slice(0, 3).join('\n').toLowerCase();
      console.log("Previous receipt first 3 lines:", prevReceiptLines);
      console.log("Previous receipt vendor:", receipt.vendor_name);
      
      // Calculate similarity using Levenshtein distance
      const maxLength = Math.max(newReceiptLines.length, prevReceiptLines.length);
      const distance = levenshteinDistance(newReceiptLines, prevReceiptLines);
      const similarity = 1 - (distance / maxLength);
      console.log("Similarity score:", similarity, "for vendor:", receipt.vendor_name);
      console.log("Distance:", distance, "Max length:", maxLength);

      // Lower threshold to 0.4 (40%) to be even more lenient
      if (similarity > 0.4 && similarity > bestMatch.similarity) {
        bestMatch = {
          similarity,
          vendorName: receipt.vendor_name,
          tags: receipt.receipt_tags?.map(rt => rt.tags) || []
        };
        console.log("New best match found:", bestMatch);
      }
    }

    if (bestMatch.vendorName) {
      console.log("Returning best match vendor:", bestMatch.vendorName, "with similarity:", bestMatch.similarity, "and tags:", bestMatch.tags);
    } else {
      console.log("No matching receipt found above threshold");
    }

    return { vendorName: bestMatch.vendorName, tags: bestMatch.tags };
  } catch (error) {
    console.error("Error finding similar receipt:", error);
    return { vendorName: null, tags: [] };
  }
}

async function hasExifData(file: File): Promise<boolean> {
  try {
    const exifData = await exifr.parse(file);
    console.log('EXIF data:', exifData);
    return !!exifData && Object.keys(exifData).length > 0;
  } catch (error) {
    console.error('Error reading EXIF data:', error);
    return false;
  }
}

const ReceiptUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receiptType, setReceiptType] = useState("Personal");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [warranty, setWarranty] = useState(false);
  const [nonImageWarning, setNonImageWarning] = useState("");
  const [showTagModal, setShowTagModal] = useState(false);
  const [newReceiptId, setNewReceiptId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
  const [autoFilledVendor, setAutoFilledVendor] = useState<string | null>(null);
  const [pendingNavigateId, setPendingNavigateId] = useState<string | null>(null);

  // Helper to detect mobile/responsive
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const extractLocationFromExif = async (file: File): Promise<{ latitude: number | null; longitude: number | null; locationName: string | null }> => {
    try {
      console.log("Starting EXIF extraction for file:", file.name);
      // Parse EXIF data including GPS coordinates
      const exifData = await exifr.parse(file, { gps: true });
      console.log("Full EXIF data extracted:", JSON.stringify(exifData, null, 2));
      
      if (exifData?.latitude && exifData?.longitude) {
        console.log("GPS coordinates found:", { latitude: exifData.latitude, longitude: exifData.longitude });
        // Try to get location name using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${exifData.latitude}&lon=${exifData.longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          console.log("Reverse geocoding result:", data);
          return {
            latitude: exifData.latitude,
            longitude: exifData.longitude,
            locationName: data.display_name || null
          };
        } catch (error) {
          console.error("Error fetching location name:", error);
          return {
            latitude: exifData.latitude,
            longitude: exifData.longitude,
            locationName: null
          };
        }
      } else {
        console.log("No GPS coordinates found in EXIF data. Attempting browser geolocation fallback.");
        // Fallback: Use browser geolocation API
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
            });
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            console.log("Browser geolocation obtained:", { latitude, longitude });
            // Try to get location name using reverse geocoding
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
              );
              const data = await response.json();
              console.log("Reverse geocoding result (browser geolocation):", data);
              return {
                latitude,
                longitude,
                locationName: data.display_name || null
              };
            } catch (error) {
              console.error("Error fetching location name (browser geolocation):", error);
              return {
                latitude,
                longitude,
                locationName: null
              };
            }
          } catch (geoError) {
            console.error("Browser geolocation failed:", geoError);
          }
        } else {
          console.log("Browser geolocation not available.");
        }
      }
      
      return { latitude: null, longitude: null, locationName: null };
    } catch (error) {
      console.error("Error extracting EXIF data:", error);
      return { latitude: null, longitude: null, locationName: null };
    }
  };

  const processReceipt = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be signed in to upload receipts.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setNonImageWarning("");
    try {
      // Check for EXIF data
      const hasExif = await hasExifData(file);
      if (!hasExif) {
        toast({
          title: "No EXIF data found",
          description: "This photo does not contain any metadata. Location may not be available.",
          variant: "default",
        });
      }
      // Extract location data from EXIF (and fallback)
      const { latitude, longitude, locationName } = await extractLocationFromExif(file);

      // Create unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Show upload started message
      toast({
        title: "Upload started",
        description: "We're processing your receipt...",
      });
      
      // First check if the file is readable
      try {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(new Error("File cannot be read"));
        });
        
        // Create a blob from file for processing
        const blob = new Blob([fileBuffer], { type: file.type });
        
        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, blob);
        
        if (uploadError) {
          console.error("Upload error details:", uploadError);
          throw new Error(`Error uploading receipt: ${uploadError.message}`);
        }
        
        console.log("File uploaded successfully:", filePath);
        
        // Get the public URL for the uploaded file
        const imagePath = supabase.storage.from("receipts").getPublicUrl(filePath).data.publicUrl;
        
        // Only process images with OCR - skip PDFs and other formats
        const isImage = file.type.startsWith('image/');
        let textContent = '';
        
        if (isImage) {
          // Preprocess image with OpenCV.js before OCR
          // Create an image element and a hidden canvas
          const img = document.createElement('img');
          const blobUrl = URL.createObjectURL(blob);
          img.src = blobUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          // Wait for OpenCV.js to be ready
          if (window.cv) {
            let src = window.cv.imread(canvas);
            window.cv.cvtColor(src, src, window.cv.COLOR_RGBA2GRAY, 0); // Grayscale
            window.cv.adaptiveThreshold(src, src, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 11, 2); // Increase contrast
            window.cv.imshow(canvas, src);
            src.delete();
          }
          // Use the preprocessed canvas as input for Tesseract.js
          try {
            const worker = await createWorker({
              logger: progress => {
                setProgress(Math.round(progress.progress * 100));
                console.log("OCR progress:", Math.round(progress.progress * 100) + "%");
              }
            });
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data } = await worker.recognize(canvas.toDataURL('image/png'));
            textContent = data.text;
            await worker.terminate();
          } catch (ocrError) {
            console.error("OCR processing error:", ocrError);
            textContent = "OCR processing failed. Please check receipt manually.";
          }
          // Clean up the blob URL
          URL.revokeObjectURL(blobUrl);
        } else {
          textContent = "Non-image file uploaded. OCR not performed.";
          setNonImageWarning("You uploaded a non-image file. Only images can be processed for receipts. Please upload a photo or scan of your receipt.");
        }
        
        // Extract potential vendor name from the first non-empty line of text
        let vendorName = "Unknown Vendor";
        if (textContent) {
          const firstLines = textContent.split('\n').filter(line => line.trim().length > 0);
          if (firstLines.length > 0) {
            vendorName = firstLines[0].trim().substring(0, 100); // Limit to 100 chars
          }
        }
        
        // Try to find similar receipt and get suggested vendor name
        const { vendorName: suggestedVendorName, tags: suggestedTags } = await findSimilarReceipt(textContent, user.id);
        let matched = false;
        if (suggestedVendorName) {
          vendorName = suggestedVendorName;
          setAutoFilledVendor(suggestedVendorName);
          setShowAutoFillDialog(true);
          matched = true;
        }
        
        // Extract potential total amount using regex pattern
        let totalAmount = null;
        const amountRegex = /(?:total|amount|sum)[:\s]*[$€£]?\s*(\d+(?:[.,]\d{1,2})?)/i;
        const amountMatch = textContent.match(amountRegex);
        if (amountMatch && amountMatch[1]) {
          // Convert to number and handle different decimal separators
          totalAmount = parseFloat(amountMatch[1].replace(',', '.'));
        }
        
        // Try to extract date from the text content
        let purchaseDate = null;
        const dateRegex = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/;
        const dateMatch = textContent.match(dateRegex);
        if (dateMatch) {
          try {
            // Always interpret as DD/MM/YYYY (European format)
            let day = dateMatch[1].padStart(2, '0');
            let month = dateMatch[2].padStart(2, '0');
            let year = dateMatch[3];
            if (year.length === 2) {
              year = '20' + year; // Assume 20xx for 2-digit years
            }
            // Output as ISO (YYYY-MM-DD)
            purchaseDate = `${year}-${month}-${day}`;
          } catch (dateError) {
            console.error("Failed to parse date (EU format):", dateError);
            // Keep purchaseDate as null if parsing fails
          }
        }
        
        // Store receipt data in the database
        const { data: insertData, error: insertError } = await supabase
          .from("receipts")
          .insert({
            user_id: user.id,
            image_path: filePath,
            text_content: textContent,
            vendor_name: vendorName,
            total_amount: totalAmount,
            purchase_date: purchaseDate,
            type: receiptType,
            client_name: receiptType === "Business" ? clientName : null,
            notes: notes || null,
            warranty: warranty,
            file_type: file.type,
            latitude,
            longitude,
            location_name: locationName
          })
          .select();

        if (insertError) {
          console.error("DB insertion error:", insertError);
          setIsLoading(false);
          return;
        }

        // If we have a new receipt and suggested tags, add them
        if (insertData && insertData.length > 0 && suggestedTags.length > 0) {
          const receiptId = insertData[0].id;
          const tagInserts = suggestedTags.map(tag => ({
            receipt_id: receiptId,
            tag_id: tag.id
          }));

          const { error: tagError } = await supabase
            .from("receipt_tags")
            .insert(tagInserts);

          if (tagError) {
            console.error("Error adding tags:", tagError);
          } else {
            toast({
              title: "Tags copied",
              description: `Copied ${suggestedTags.length} tags from the similar receipt`,
            });
          }
        }
        
        if (!isImage) {
          setIsLoading(false);
          return; // Do not navigate away or show success for non-image
        }
        
        toast({
          title: "Receipt uploaded",
          description: "Your receipt has been processed successfully.",
        });
        
        if (insertData && insertData.length > 0 && insertData[0].id) {
          if (isMobile) {
            setNewReceiptId(insertData[0].id);
            return insertData[0].id;
          } else {
            if (matched) {
              setPendingNavigateId(insertData[0].id);
            } else {
              navigate(`/receipt/${insertData[0].id}`);
            }
          }
        } else {
          navigate("/receipts");
        }
      } catch (fileError) {
        console.error("File processing error:", fileError);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error processing receipt:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const fileType = file.type;
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    
    if (!validTypes.includes(fileType)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, HEIC image or PDF file.",
        variant: "destructive",
      });
      return;
    }
    
    if (isMobile) {
      setPendingFile(file);
      setShowTagModal(true);
    } else {
      processReceipt(file);
    }
  };
  
  // Handle dialog OK click
  const handleAutoFillDialogOk = () => {
    setShowAutoFillDialog(false);
    if (pendingNavigateId) {
      navigate(`/receipt/${pendingNavigateId}`);
      setPendingNavigateId(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-2xl font-bold mb-4">{isMobile ? "New Receipt" : "Upload Receipt"}</h2>
      <div className="w-full max-w-md mb-4">
        <label className="block mb-2 font-medium">Type</label>
        <select
          className="border rounded px-2 py-1 w-full"
          value={receiptType}
          onChange={e => setReceiptType(e.target.value)}
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
              onChange={e => {
                if (e.target.value === "__new__") {
                  setShowNewClientInput(true);
                  setClientName("");
                } else {
                  setShowNewClientInput(false);
                  setClientName(e.target.value);
                }
              }}
            >
              <option value="">Select client...</option>
              {FAKE_CLIENTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__new__">Add new client...</option>
            </select>
            {showNewClientInput && (
              <input
                type="text"
                className="border rounded px-2 py-1 flex-1"
                placeholder="Enter new client name"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            )}
          </div>
        </div>
      )}
      <div className="w-full max-w-md mb-4">
        <label className="block mb-2 font-medium" htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          className="border rounded px-2 py-1 w-full min-h-[60px]"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add any notes about this receipt..."
          disabled={isLoading}
        />
      </div>
      <div className="w-full max-w-md mb-4 flex items-center gap-2">
        <input
          id="warranty"
          type="checkbox"
          checked={warranty}
          onChange={e => setWarranty(e.target.checked)}
          className="h-4 w-4"
          disabled={isLoading}
        />
        <label htmlFor="warranty" className="font-medium select-none cursor-pointer">Warranty?</label>
      </div>
      <input
        id="receipt-upload"
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/heic,application/pdf"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      {!isMobile && (
        <div className="w-full max-w-md">
          <label 
            htmlFor="receipt-upload" 
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, HEIC or PDF (max 10MB)
              </p>
            </div>
          </label>
        </div>
      )}
      
      {isLoading && !showTagModal && (
        <div className="w-full max-w-md">
          <div className="mb-2 flex justify-between">
            <span>Processing...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
      )}
      
      {nonImageWarning && (
        <div className="w-full max-w-md mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300 text-center">
          {nonImageWarning}
        </div>
      )}
      
      <div className="flex gap-2 mt-4">
        {!isMobile && (
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => document.getElementById("receipt-upload")?.click()}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Upload Receipt"}
            </Button>
          </>
        )}
        {isMobile && (
          <div className="w-full flex flex-col items-center" style={{ maxWidth: 340 }}>
            <button
              type="button"
              className="bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold py-5 px-6 rounded-full w-full shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-center gap-2"
              onClick={() => document.getElementById("receipt-upload")?.click()}
              disabled={isLoading}
            >
              <Camera className="w-6 h-6 -ml-1" />
              {isLoading ? "Processing..." : "SNAP RECEIPT"}
            </button>
            <button
              type="button"
              className="border border-orange-400 text-orange-500 font-semibold rounded-full w-full py-3 mt-2 transition-all duration-150 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-200"
              onClick={() => navigate("/")}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <Dialog open={showTagModal} onOpenChange={(open) => {
        if (!open) {
          setShowTagModal(false);
          navigate("/");
        }
      }}>
        <DialogContent className="max-w-xs w-full flex flex-col items-center gap-8 p-8 bg-white rounded-2xl shadow-2xl animate-scale-in">
          <div className="text-xl font-bold text-center mb-2">What would you like to do next?</div>
          <div className="text-gray-500 text-center mb-4">You can tag this receipt now, or do it later.</div>
          <div className="flex flex-col gap-4 w-full">
            <button
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white text-xl font-bold py-4 rounded-full shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 w-full"
              onClick={() => {
                setShowTagModal(false);
                if (pendingFile) {
                  setIsLoading(true);
                  processReceipt(pendingFile).then((receiptId) => {
                    if (receiptId) navigate(`/receipt/${receiptId}`);
                  });
                  setPendingFile(null);
                }
              }}
            >
              <Tag className="w-6 h-6" /> TAG NOW
            </button>
            <button
              className="flex items-center justify-center gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50 text-lg font-semibold py-3 rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-300 w-full"
              onClick={() => {
                setShowTagModal(false);
                if (pendingFile) {
                  processReceipt(pendingFile);
                  setPendingFile(null);
                }
                navigate("/");
              }}
            >
              <Clock className="w-5 h-5" /> LATER
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAutoFillDialog}>
        <DialogContent className="max-w-xs w-full flex flex-col items-center gap-6 p-8 bg-white rounded-2xl shadow-2xl animate-scale-in">
          <div className="text-xl font-bold text-center mb-2">Receipt Details Auto-Filled</div>
          <div className="text-gray-600 text-center mb-4">
            We recognized this receipt and have auto-filled the vendor and tags for you.<br />
            You can review or edit the details below, but you're good to go!
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handleAutoFillDialogOk}
          >
            OK
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceiptUpload;
