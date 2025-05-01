
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { formatDistanceToNow, format } from "date-fns";

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

        // Ensure all objects have the expected properties, even if null
        const completeReceipts: Receipt[] = (data || []).map(item => ({
          id: item.id,
          user_id: item.user_id,
          image_path: item.image_path,
          text_content: item.text_content,
          vendor_name: item.vendor_name || null,
          total_amount: item.total_amount || null,
          purchase_date: item.purchase_date || null,
          created_at: item.created_at,
          updated_at: item.updated_at
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

    fetchReceipts();
  }, []);

  const handleDelete = async (id: string, imagePath: string) => {
    try {
      // First delete from database
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
                  src={receipt.image_path}
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
                    <h3 className="font-medium text-lg">{receipt.vendor_name || "Unknown Vendor"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {receipt.purchase_date ? format(new Date(receipt.purchase_date), 'MMM d, yyyy') : 
                      formatDistanceToNow(new Date(receipt.updated_at), { addSuffix: true })}
                    </p>
                    {receipt.total_amount && (
                      <p className="mt-1 font-semibold">{formatCurrency(receipt.total_amount)}</p>
                    )}
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
