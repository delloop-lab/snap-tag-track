import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const TagUntagged = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [imageLoaded, setImageLoaded] = useState({});
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUntagged = async () => {
      setLoading(true);
      // Fetch receipts with no tags
      const { data, error } = await supabase
        .from("receipts")
        .select(`*, receipt_tags(tag_id)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setReceipts([]);
        setImageUrls({});
        setLoading(false);
        return;
      }
      // Only receipts with no tags
      const untagged = (data || []).filter(r => !r.receipt_tags || r.receipt_tags.length === 0);
      setReceipts(untagged);
      // Generate signed URLs for images
      const urls = {};
      await Promise.all(
        untagged.map(async (r) => {
          if (r.image_path) {
            const { data: signedData } = await supabase.storage.from('receipts').createSignedUrl(r.image_path, 60 * 60);
            if (signedData?.signedUrl) urls[r.id] = signedData.signedUrl;
          }
        })
      );
      setImageUrls(urls);
      setLoading(false);
    };
    fetchUntagged();
  }, [user]);

  if (!isMobile) {
    return <div className="p-8 text-center text-lg">This view is only available on mobile.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Tag Untagged Receipts</h2>
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <svg className="animate-spin h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center text-muted-foreground">All your receipts are tagged! ��</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
          {receipts.map(receipt => (
            <div
              key={receipt.id}
              className="border rounded-lg overflow-hidden shadow-sm flex-shrink-0 w-56 bg-white snap-center"
              style={{ minWidth: '224px', maxWidth: '224px' }}
            >
              <div className="aspect-[3/4] bg-gray-100 relative">
                {receipt.image_path && !imageLoaded[receipt.id] && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center gap-2 bg-gray-200 animate-pulse rounded-md px-4 py-6">
                    <div className="h-4 w-3/4 bg-gray-300 rounded mb-1" />
                    <div className="h-3 w-2/3 bg-gray-300 rounded mb-1" />
                    <div className="h-3 w-1/2 bg-gray-300 rounded mb-1" />
                    <div className="h-3 w-5/6 bg-gray-300 rounded mb-1" />
                    <div className="h-4 w-1/3 bg-gray-300 rounded mt-2" />
                  </div>
                )}
                {receipt.image_path && (
                  <img
                    src={imageUrls[receipt.id] || "/placeholder.svg"}
                    alt="Receipt"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded[receipt.id] ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(l => ({ ...l, [receipt.id]: true }))}
                    onError={e => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                      setImageLoaded(l => ({ ...l, [receipt.id]: true }));
                    }}
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-base truncate max-w-[140px]">{receipt.vendor_name || "Unknown Vendor"}</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {receipt.purchase_date ? format(new Date(receipt.purchase_date), 'MMM d, yyyy') : "No date"}
                </p>
                <Button
                  className="w-full mt-2"
                  onClick={() => navigate(`/receipt/${receipt.id}`)}
                >
                  Tag Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagUntagged; 