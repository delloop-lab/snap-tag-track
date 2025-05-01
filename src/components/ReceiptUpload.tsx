
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createWorker } from "tesseract.js";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

const ReceiptUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const processReceipt = async (file: File) => {
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
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, file);
      
      if (uploadError) {
        throw new Error(`Error uploading receipt: ${uploadError.message}`);
      }
      
      // Run OCR on the uploaded image
      const worker = await createWorker('eng');
      
      worker.setProgressHandler((p) => {
        setProgress(Math.round(p.progress * 100));
      });
      
      const { data } = await worker.recognize(file);
      await worker.terminate();
      
      // Store receipt data in the database
      const { error: insertError } = await supabase
        .from("receipts")
        .insert({
          image_path: filePath,
          text_content: data.text
        });
      
      if (insertError) {
        throw new Error(`Error saving receipt data: ${insertError.message}`);
      }
      
      toast({
        title: "Receipt uploaded",
        description: "Your receipt has been processed successfully.",
      });
      
      navigate("/receipts");
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
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
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
