
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

type Receipt = {
  id: string;
  image_path: string;
  text_content: string | null;
  created_at: string;
  user_id: string;
};

const ReceiptList = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const { data, error } = await supabase
          .from("receipts")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setReceipts(data || []);
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

    fetchReceipts();
  }, []);

  const getImageUrl = (path: string) => {
    return supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;
  };

  const handleDelete = async (id: string, imagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("receipts")
        .remove([imagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("receipts")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // Update the UI
      setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));

      toast({
        title: "Receipt deleted",
        description: "The receipt has been removed successfully",
      });
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
        <p>Loading receipts...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Receipts</h2>
        <Button onClick={() => navigate("/upload")}>Upload New Receipt</Button>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            You haven't uploaded any receipts yet.
          </p>
          <Button 
            onClick={() => navigate("/upload")} 
            className="mt-4"
          >
            Upload Your First Receipt
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-[3/4] bg-gray-100">
                <img
                  src={getImageUrl(receipt.image_path)}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(receipt.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="mt-2 text-sm line-clamp-3">
                      {receipt.text_content || "No text extracted"}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(receipt.id, receipt.image_path)}
                  >
                    Delete
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => navigate(`/receipt/${receipt.id}`)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceiptList;
