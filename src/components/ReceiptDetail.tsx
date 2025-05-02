
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import TagInput from "./TagInput";
import TagSuggestion from "./TagSuggestion";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

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

const ReceiptDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVendor, setEditedVendor] = useState("");
  const [editedAmount, setEditedAmount] = useState("");
  const [editedDate, setEditedDate] = useState<Date | undefined>(undefined);
  const [tagsRefreshKey, setTagsRefreshKey] = useState(0);
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

        // Make sure all required fields are present, even if null
        const completeReceipt: Receipt = {
          id: data.id,
          user_id: data.user_id,
          image_path: data.image_path,
          text_content: data.text_content || null,
          vendor_name: data.vendor_name || null,
          total_amount: data.total_amount || null,
          purchase_date: data.purchase_date || null,
          created_at: data.created_at,
          updated_at: data.updated_at
        };

        setReceipt(completeReceipt);
        
        // Initialize edit fields with current values
        setEditedVendor(completeReceipt.vendor_name || "");
        setEditedAmount(completeReceipt.total_amount?.toString() || "");
        if (completeReceipt.purchase_date) {
          setEditedDate(new Date(completeReceipt.purchase_date));
        }
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "Not available";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
        })
        .eq("id", receipt.id);

      if (error) {
        throw error;
      }

      // Update local state
      setReceipt({
        ...receipt,
        vendor_name: editedVendor || null,
        total_amount: parsedAmount,
        purchase_date: editedDate ? format(editedDate, 'yyyy-MM-dd') : null,
      });

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
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate("/receipts")}>
            Back to Receipts
          </Button>
          {!isEditing && (
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <img
            src={receipt.image_path}
            alt="Receipt"
            className="w-full h-auto object-contain bg-gray-50"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>

        <div className="space-y-4">
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

              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSaveChanges}>Save Changes</Button>
                <Button variant="outline" onClick={cancelEditing}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{receipt.vendor_name || "Unknown Vendor"}</h3>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {receipt.purchase_date 
                  ? format(new Date(receipt.purchase_date), "PPP") 
                  : "Not available"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium">{formatCurrency(receipt.total_amount)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Uploaded on</p>
              <p className="font-medium">
                {format(new Date(receipt.created_at), "PPp")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Tags</p>
            {receipt.id && <TagInput key={tagsRefreshKey} receiptId={receipt.id} />}
            {receipt.id && receipt.text_content && (
              <TagSuggestion 
                receiptId={receipt.id} 
                textContent={receipt.text_content}
                onTagAdded={handleTagAdded}
              />
            )}
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
