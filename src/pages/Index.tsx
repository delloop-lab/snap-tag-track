import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Camera, Tag, BarChart3 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [recentImages, setRecentImages] = useState<{ [id: string]: string }>({});
  const [totalThisYear, setTotalThisYear] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!loading && user) {
      // Fetch first name from user profile
      const fetchFirstName = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("first_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (!error && data) {
          const userData = data as { first_name?: string; avatar_url?: string };
          if (userData.first_name) setFirstName(userData.first_name);
          if (userData.avatar_url) setAvatarUrl(userData.avatar_url);
        }
      };
      fetchFirstName();
      // Fetch recent receipts and stats
      const fetchRecent = async () => {
        const year = new Date().getFullYear();
        const { data: receipts } = await supabase
          .from("receipts")
          .select("id, vendor_name, total_amount, purchase_date, image_path")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentReceipts(receipts || []);
        // Fetch signed URLs for images
        if (receipts && receipts.length > 0) {
          const imageUrls: { [id: string]: string } = {};
          await Promise.all(
            receipts.map(async (r) => {
              if (r.image_path) {
                const { data } = await supabase.storage.from('receipts').createSignedUrl(r.image_path, 60 * 60);
                if (data?.signedUrl) imageUrls[r.id] = data.signedUrl;
              }
            })
          );
          setRecentImages(imageUrls);
        }
        // Stat: total receipts this year
        const { count } = await supabase
          .from("receipts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", `${year}-01-01`);
        setTotalThisYear(count || 0);
      };
      fetchRecent();
    }
  }, [user, loading]);

  const handleRecentClick = (id) => {
    navigate(`/summary?highlight=${id}`);
  };

  // Handler for TAG button: go to last uploaded receipt or untagged view on mobile
  const handleTagClick = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (window.innerWidth < 768) {
      navigate("/tag-untagged");
      return;
    }
    // Desktop: go to last uploaded receipt as before
    const { data: receipts, error } = await supabase
      .from("receipts")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !receipts || receipts.length === 0) {
      navigate("/receipts");
      return;
    }
    navigate(`/receipt/${receipts[0].id}`);
  };

  return (
    <div className="min-h-screen h-screen flex flex-col items-center justify-center bg-white py-8 md:py-12 px-2 md:px-4">
      <div className="w-full max-w-3xl md:bg-white md:rounded-2xl md:shadow-2xl p-4 md:p-10 flex flex-col items-center h-full justify-center">
        <img src="/SnapTagTrack.png" alt="SnapTagForget Logo" className="w-3/4 h-auto mx-auto mt-10 mb-12 block md:hidden" />
        {/* Avatar and welcome message for all screen sizes */}
        {user && avatarUrl && (
          <img
            src={avatarUrl}
            alt="User Avatar"
            className="h-20 w-20 rounded-full object-cover mx-auto mb-4"
          />
        )}
        <p className="text-xl text-gray-600 mb-8 text-center">
          {user && firstName ? `Welcome, ${firstName}!` : "Welcome! Capture receipts, extract text, and never worry about losing them again."}
        </p>
        <div className="flex flex-col md:flex-row gap-4 w-full mb-10">
          <Button className="flex-1 text-4xl py-6 bg-[#FF9500] hover:bg-[#E68500] text-white border-none rounded-full flex items-center justify-center gap-2" size="lg" onClick={() => navigate("/upload")}>
            <Camera className="!h-[40px] !w-[40px]" />
            SNAP
          </Button>
          <Button className="flex-1 text-4xl py-6 bg-[#4A8AE6] hover:bg-[#3A7AD6] text-white border-none rounded-full flex items-center justify-center gap-2" size="lg" onClick={handleTagClick}>
            <Tag className="!h-[40px] !w-[40px]" />
            TAG
          </Button>
          <Button className="flex-1 text-4xl py-6 bg-[#7CB87E] hover:bg-[#6CA66E] text-white border-none rounded-full flex items-center justify-center gap-2" size="lg" onClick={() => navigate("/summary")}>
            <BarChart3 className="!h-[40px] !w-[40px]" />
            TRACK
          </Button>
        </div>
        {user && (
          <>
            <div className="w-full mb-10 hidden md:block">
              <h2 className="text-2xl font-semibold mb-4">Recent Receipts</h2>
              {recentReceipts.length === 0 ? (
                <p className="text-muted-foreground text-base">No receipts yet. <Button variant="link" onClick={() => navigate("/upload")}>Upload your first receipt</Button></p>
              ) : (
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {recentReceipts.map(r => (
                    <div
                      key={r.id}
                      className="md:border md:rounded-xl md:bg-gray-50 flex-shrink-0 w-48 p-3 flex flex-col items-center md:shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-400 transition"
                      onClick={() => handleRecentClick(r.id)}
                    >
                      <div className="aspect-[3/4] w-full bg-gray-200 rounded-lg mb-3 overflow-hidden">
                        <img
                          src={recentImages[r.id] || "/placeholder.svg"}
                          alt="Receipt"
                          className="w-full h-full object-cover"
                          onError={e => (e.target as HTMLImageElement).src = "/placeholder.svg"}
                        />
                      </div>
                      <div className="w-full text-center">
                        <div className="font-medium text-base truncate">{r.vendor_name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{r.purchase_date ? format(new Date(r.purchase_date), "MMM d, yyyy") : "-"}</div>
                        <div className="text-sm font-semibold mt-1">{r.total_amount != null ? `$${r.total_amount.toFixed(2)}` : "-"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-full text-center text-lg text-muted-foreground mb-2">
              You've uploaded <span className="font-bold text-primary">{totalThisYear}</span> receipt{totalThisYear === 1 ? "" : "s"} this year.
            </div>
          </>
        )}
        <div className="w-full text-center text-base text-gray-400 mt-8">
          Tip: For best OCR, scan receipts on a flat surface with good lighting.
        </div>
      </div>
      <footer className="w-full text-center text-xs text-gray-400 mt-8 mb-2">
        Copyright (c) 2025 The Novita Group
      </footer>
    </div>
  );
};

export default Index;
