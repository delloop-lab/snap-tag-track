import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createWorker } from "tesseract.js";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Progress } from "@/components/ui/progress";

const ReceiptUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

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
    try {
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
        const imageUrl = supabase.storage.from("receipts").getPublicUrl(filePath).data.publicUrl;
        
        // Only process images with OCR - skip PDFs and other formats
        const isImage = file.type.startsWith('image/');
        let textContent = '';
        
        if (isImage) {
          // Create a blob URL for the file to use with Tesseract.js
          const blobUrl = URL.createObjectURL(blob);
          
          console.log("Starting OCR processing...");
          try {
            const worker = await createWorker({
              logger: progress => {
                setProgress(Math.round(progress.progress * 100));
                console.log("OCR progress:", Math.round(progress.progress * 100) + "%");
              }
            });
            
            console.log("Worker created, loading language...");
            await worker.loadLanguage('eng');
            console.log("Language loaded, initializing...");
            await worker.initialize('eng');
            console.log("Worker initialized, starting recognition...");
            
            const { data } = await worker.recognize(blobUrl);
            console.log("Recognition complete");
            textContent = data.text;
            await worker.terminate();
            
            // Clean up the blob URL
            URL.revokeObjectURL(blobUrl);
          } catch (ocrError) {
            console.error("OCR processing error:", ocrError);
            // Don't throw - we'll still save the receipt without text content
            textContent = "OCR processing failed. Please check receipt manually.";
          }
        } else {
          textContent = "Non-image file uploaded. OCR not performed.";
        }
        
        // Extract potential vendor name from the first non-empty line of text
        let vendorName = "Unknown Vendor";
        if (textContent) {
          const firstLines = textContent.split('\n').filter(line => line.trim().length > 0);
          if (firstLines.length > 0) {
            vendorName = firstLines[0].trim().substring(0, 100); // Limit to 100 chars
          }
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
        const dateRegex = /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/;
        const dateMatch = textContent.match(dateRegex);
        if (dateMatch && dateMatch[0]) {
          try {
            const dateParts = dateMatch[0].split(/[-/.]/);
            // Attempt to create a valid date (this is simplified and could be enhanced)
            if (dateParts.length === 3) {
              purchaseDate = new Date().toISOString().split('T')[0]; // Fallback to today
              // Try to determine date format based on values
              if (parseInt(dateParts[0]) <= 31 && parseInt(dateParts[1]) <= 12) {
                // Likely DD/MM/YYYY
                purchaseDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
              } else if (parseInt(dateParts[1]) <= 12) {
                // Likely YYYY/MM/DD or MM/DD/YYYY
                if (dateParts[0].length === 4) {
                  purchaseDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
                } else {
                  purchaseDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
                }
              }
            }
          } catch (dateError) {
            console.error("Failed to parse date:", dateError);
            // Keep purchaseDate as null if parsing fails
          }
        }
        
        // Store receipt data in the database
        const { error: insertError } = await supabase
          .from("receipts")
          .insert({
            user_id: user.id,
            image_url: imageUrl,
            raw_text: textContent,
            vendor_name: vendorName,
            total_amount: totalAmount,
            purchase_date: purchaseDate,
          });
        
        if (insertError) {
          console.error("DB insertion error:", insertError);
          throw new Error(`Error saving receipt data: ${insertError.message}`);
        }
        
        toast({
          title: "Receipt uploaded",
          description: "Your receipt has been processed successfully.",
        });
        
        navigate("/receipts");
      } catch (fileError) {
        console.error("File processing error:", fileError);
        throw new Error(`Error processing file: ${fileError instanceof Error ? fileError.message : "Unknown file error"}`);
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
    
    // Process the receipt
    processReceipt(file);
  };
  
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-2xl font-bold mb-4">Upload Receipt</h2>
      
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
          <input
            id="receipt-upload"
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/heic,application/pdf"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </label>
      </div>
      
      {isLoading && (
        <div className="w-full max-w-md">
          <div className="mb-2 flex justify-between">
            <span>Processing...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
      )}
      
      <div className="flex gap-2 mt-4">
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
      </div>
    </div>
  );
};

export default ReceiptUpload;
