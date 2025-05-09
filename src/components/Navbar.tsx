import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Menu, X, Home, Receipt, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUserName = async () => {
        try {
          const { data } = await supabase
            .from("users")
            .select("first_name, last_name")
            .eq("id", user.id)
            .single();
          
          if (data) {
            const userData = data as { first_name: string | null; last_name: string | null };
            const name = [userData.first_name, userData.last_name].filter(Boolean).join(" ");
            setUserName(name || "");
          }
        } catch (error) {
          console.error("Error fetching user name:", error);
        }
      };
      fetchUserName();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchRecentReceipts = async () => {
        const { data } = await supabase
          .from("receipts")
          .select("id, vendor_name, total_amount, purchase_date, image_path")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentReceipts(data || []);
      };
      fetchRecentReceipts();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to={user ? "/landing2" : "/"} className="flex items-center">
                <img
                  src="/SnapTagTrack.png"
                  alt="SnapTagTrack Logo"
                  className="h-8 w-auto"
                />
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <a 
              href={`mailto:help@snaptagtrack.com?subject=I am having issue with SnapTagTrack&body=${userName ? `Hi SnapTagTrak Team.%0D%0A%0D%0AMy name is ${userName} and my issue is ` : `Hello SnapTagTrack Team.%0D%0A%0D%0AI am having an issue, let me tell you what it is.%0D%0A%0D%0A`}`}
              className="text-sm font-semibold hover:underline text-red-600 px-2"
            >
              HELP
            </a>
            <Link
              to="/"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                location.pathname === "/"
                  ? "border-blue-500 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Link>
            <Link
              to="/summary"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                location.pathname === "/summary"
                  ? "border-blue-500 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <FileText className="h-4 w-4 mr-1" />
              Summary
            </Link>
            <Link
              to="/receipts"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                location.pathname === "/receipts"
                  ? "border-blue-500 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Receipt className="h-4 w-4 mr-1" />
              Receipts
            </Link>
            {user && (
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Profile
                </Link>
                <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Sign Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign Out</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to sign out?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSignOut}>
                        Sign Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {menuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {/* Remove the first Summary link here */}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user && (
              <div className="space-y-1">
                <Link
                  to="/profile"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <a 
                  href={`mailto:help@snaptagtrack.com?subject=I am having issue with SnapTagTrack&body=${userName ? `Hi SnapTagTrak Team.%0D%0A%0D%0AMy name is ${userName} and my issue is ` : `Hello SnapTagTrack Team.%0D%0A%0D%0AI am having an issue, let me tell you what it is.%0D%0A%0D%0A`}`}
                  className="text-sm font-semibold py-2 text-red-600 px-2" 
                  onClick={() => setMenuOpen(false)}
                >
                  HELP
                </a>
                <Link
                  to="/"
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    location.pathname === "/"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Home className="h-5 w-5 mr-2" />
                    Home
                  </div>
                </Link>
                <Link
                  to="/summary"
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    location.pathname === "/summary"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Summary
                  </div>
                </Link>
                <Link
                  to="/receipts"
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    location.pathname === "/receipts"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Receipt className="h-5 w-5 mr-2" />
                    Receipts
                  </div>
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setSignOutDialogOpen(true);
                  }}
                  className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
          {user && recentReceipts.length > 0 && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <h2 className="text-lg font-semibold mb-2 text-center">Recent Receipts</h2>
              {/* Mobile: show 3, Desktop: show 5 with scroll */}
              {isMobile ? (
                <div className="flex flex-col gap-2">
                  {recentReceipts.slice(0, 3).map(r => (
                    <div key={r.id} className="flex flex-col items-center border rounded-lg p-2 bg-gray-50">
                      <div className="font-medium text-sm truncate w-full text-center">{r.vendor_name || "Unknown Vendor"}</div>
                      <div className="text-xs text-gray-500">{r.purchase_date ? format(new Date(r.purchase_date), 'MMM d, yyyy') : "-"}</div>
                      <div className="text-sm font-semibold">{r.total_amount != null ? `$${r.total_amount.toFixed(2)}` : "-"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {recentReceipts.map(r => (
                    <div key={r.id} className="flex-shrink-0 w-48 flex flex-col items-center border rounded-lg p-2 bg-gray-50">
                      <div className="font-medium text-sm truncate w-full text-center">{r.vendor_name || "Unknown Vendor"}</div>
                      <div className="text-xs text-gray-500">{r.purchase_date ? format(new Date(r.purchase_date), 'MMM d, yyyy') : "-"}</div>
                      <div className="text-sm font-semibold">{r.total_amount != null ? `$${r.total_amount.toFixed(2)}` : "-"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;

