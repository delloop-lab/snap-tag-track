import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Camera, Tag, BarChart3, HelpCircle, Info, InfoIcon } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [recentImages, setRecentImages] = useState<{ [id: string]: string }>({});
  const [totalThisYear, setTotalThisYear] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Punchy, benefit-led, practical, friendly, and confident messages
  const welcomeMessages = [
    {
      main: "Receipts you can actually find later.",
      sub: "No more digging through drawers or email threads. Snap, tag, done."
    },
    {
      main: "Turn every receipt into a searchable, trackable, organised record.",
      sub: "For spending, warranties, budgeting, or proof when you need it."
    },
    {
      main: "Snap your receipts and let us handle the rest.",
      sub: "Track spending. Save warranties. Be ready at tax time or return time."
    },
    {
      main: "Because life's too short to lose receipts.",
      sub: "Snap, tag, and track your purchases in seconds."
    },
    {
      main: "The simple way to organise receipts, track spending, and keep your warranties safe.",
      sub: "No spreadsheets. No stress. Just snap it and go."
    }
  ];
  // Pick a random message on each refresh
  const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
  const randomMessage = welcomeMessages[randomIndex];

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
          .limit(isMobile ? 3 : 5);
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="flex flex-col items-center justify-center bg-white py-4 md:py-12 px-2 md:px-4">
      <div className="w-full p-0 md:p-0 flex flex-col items-center h-full justify-center">
        {/* Avatar and welcome message for all screen sizes */}
        {user && avatarUrl && (
          <img
            src={avatarUrl}
            alt="User Avatar"
            className="h-20 w-20 rounded-full object-cover mx-auto mb-4 hidden md:block"
          />
        )}
        <p className="text-xl text-gray-600 mb-2 text-center font-semibold">
          {user && firstName ? `Welcome back, ${firstName}!` : randomMessage.main}
        </p>
        {!user && (
          <p className="text-base text-gray-400 mb-14 text-center font-normal">{randomMessage.sub}</p>
        )}
        <div className="flex flex-col gap-4 w-full items-center mb-10">
          <Button className="w-1/2 max-w-xs text-4xl py-6 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white border-none rounded-full flex items-center justify-center gap-2 shadow-lg transition active:scale-95" size="lg" onClick={() => navigate("/upload")}>
            <Camera className="!h-[30px] !w-[30px]" />
            SNAP
          </Button>
          <Button className="w-1/2 max-w-xs text-4xl py-6 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white border-none rounded-full flex items-center justify-center gap-2 shadow-lg transition active:scale-95" size="lg" onClick={handleTagClick}>
            <Tag className="!h-[30px] !w-[30px]" />
            TAG
          </Button>
          <Button className="w-1/2 max-w-xs text-4xl py-6 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white border-none rounded-full flex items-center justify-center gap-2 shadow-lg transition active:scale-95" size="lg" onClick={() => navigate("/summary")}>
            <BarChart3 className="!h-[30px] !w-[30px]" />
            TRACK
          </Button>
        </div>
        {user && (
          <div className="w-full flex flex-col items-center mb-2">
            <h2 className="text-2xl font-semibold mb-1 text-center">Recent Receipts</h2>
            {recentReceipts.length === 0 ? (
              <p className="text-muted-foreground text-base text-center">No receipts yet. <Button variant="link" onClick={() => navigate("/upload")}>Upload your first receipt</Button></p>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-0 justify-center w-full md:max-w-[calc(5*192px+4*24px)] md:scrollbar-thin md:scrollbar-thumb-gray-300 md:scrollbar-track-gray-100">
                {recentReceipts.slice(0, isMobile ? 2 : 5).map(r => (
                  <div
                    key={r.id}
                    className="border border-gray-300 rounded-xl bg-white flex-shrink-0 w-48 p-3 flex flex-col items-center shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-400 transition"
                    onClick={() => handleRecentClick(r.id)}
                  >
                    <div className="aspect-[3/4] w-full bg-gray-200 rounded-lg mb-3 overflow-hidden relative">
                      {!recentImages[r.id] ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 animate-pulse">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-400 rounded-full animate-spin" />
                            <span className="text-[8px] text-gray-400 font-semibold">Loading...</span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={recentImages[r.id] || "/placeholder.svg"}
                          alt="Receipt"
                          className="w-full h-full object-cover"
                          onError={e => (e.target as HTMLImageElement).src = "/placeholder.svg"}
                        />
                      )}
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
        )}
        <div className="w-full text-center text-lg text-muted-foreground mt-0 mb-0 md:mt-1 md:mb-2">
          {user
            ? <>
                You've uploaded <span className="font-bold text-primary">{totalThisYear}</span> receipt{totalThisYear === 1 ? "" : "s"} this year.
              </>
            : "Snap a receipt today!"
          }
        </div>
        <div className="w-full text-center text-base text-gray-400 mt-1 md:mt-8">
          Tip: For best OCR, scan receipts on a flat surface with good lighting.
        </div>
        {/* QR code and prompt for mobile app */}
        <div className="hidden md:flex flex-row items-center justify-center gap-4 mt-4 mb-8">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?data=https://www.snaptagtrack.com&size=120x120"
            alt="QR code for SnapTagTrack"
            className="w-24 h-24"
          />
          <span className="text-base text-gray-700 font-medium">Want SnapTagTrack on your phone?</span>
        </div>
      </div>
      <footer
        className="w-full text-center text-xs text-gray-400 mt-2 md:mt-[46px] pb-2 md:pb-5"
        style={{ paddingTop: 2 }}
      >
        Copyright (c) 2025 The Novita Group
      </footer>
    </div>
  );
};

export default Index;
