
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

type Receipt = {
  id: string;
  image_path: string;
  text_content: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

const ReceiptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from("receipts")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        setReceipt(data);
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

    fetchReceipt();
  }, [id, navigate]);

  const getImageUrl = (path: string) => {
    return supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;
  };

  const handleDelete = async () => {
    if (!receipt) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("receipts")
        .remove([receipt.image_path]);

      if (storageError) throw storageError;

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading receipt details...</p>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Receipt Details</h2>
        <Button variant="outline" onClick={() => navigate("/receipts")}>
          Back to Receipts
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <img
            src={getImageUrl(receipt.image_path)}
            alt="Receipt"
            className="w-full h-auto object-contain bg-gray-50"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Uploaded on</p>
            <p className="font-medium">
              {format(new Date(receipt.created_at), "PPpp")}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Extracted Text</p>
            <div className="bg-muted p-3 rounded-md max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {receipt.text_content || "No text extracted"}
              </pre>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={handleDelete}
            className="mt-6"
          >
            Delete Receipt
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetail;
