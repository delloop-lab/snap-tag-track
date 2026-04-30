import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Home, Receipt, LogOut, User, FileText, Menu, X, HelpCircle, Shield } from "lucide-react";
import { ExpandableTabs } from "./ui/expandable-tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("first_name, last_name, avatar_url, user_type")
        .eq("id", user.id)
        .single();

      setIsAdmin(data?.user_type === "admin");
      
      // Check if profile is incomplete
      if (!data?.first_name || !data?.last_name || !data?.avatar_url) {
        setShowProfilePrompt(true);
        // Hide prompt after 5 seconds
        const timer = setTimeout(() => {
          setShowProfilePrompt(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    })();
  }, [user]);

  const tabs = [
    { title: "Home", icon: Home, type: "tab" as const },
    { title: "Receipts", icon: Receipt, type: "tab" as const },
    { title: "Summary", icon: FileText, type: "tab" as const },
    ...(isAdmin ? [{ title: "Admin", icon: Shield, type: "tab" as const }] : []),
    { type: "separator" as const },
    { title: "Profile", icon: User, type: "tab" as const },
    { title: "Help", icon: HelpCircle, type: "tab" as const },
  ];

  const routeForTabTitle = (title: string): string | null => {
    switch (title) {
      case "Home":
        return "/";
      case "Receipts":
        return "/receipts";
      case "Summary":
        return "/summary";
      case "Admin":
        return "/admin";
      case "Profile":
        return "/profile";
      case "Help":
        return "/help";
      default:
        return null;
    }
  };

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const tab = tabs[index];
    if (tab.type !== "tab" || !tab.title) return;
    const route = routeForTabTitle(tab.title);
    if (!route) return;
    navigate(route);
    if (isMobile) setIsMenuOpen(false);
  };

  const getCurrentTabIndex = () => {
    for (let i = 0; i < tabs.length; i += 1) {
      const tab = tabs[i];
      if (tab.type !== "tab" || !tab.title) continue;
      const route = routeForTabTitle(tab.title);
      if (!route) continue;
      const match =
        route === "/" ? location.pathname === "/" : location.pathname.startsWith(route);
      if (match) return i;
    }
    return 0;
  };

  return (
    <nav className="bg-white shadow-md dark:bg-gray-800 md:hidden">
      {showProfilePrompt && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-50 border border-blue-500 text-blue-600 px-4 py-3 rounded shadow-lg">
          <div className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            <p>Complete your profile to get the most out of SnapTagTrack!</p>
            <button 
              onClick={() => navigate('/profile')}
              className="ml-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Complete Now
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/landing2" className="flex-shrink-0 flex items-center">
              <img
                className="h-8 w-auto"
                src="/SnapTagTrack.png"
                alt="Receipt App"
              />
            </Link>
          </div>

          <div className="flex items-center">
            {user ? (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4">
                  <ExpandableTabs 
                    tabs={tabs}
                    className="border-gray-200 dark:border-gray-700"
                    activeColor="text-blue-500"
                    onChange={handleTabChange}
                    defaultSelected={getCurrentTabIndex()}
                  />
                  <button
                    onClick={signOut}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <span className="sr-only">Open main menu</span>
                    {isMenuOpen ? (
                      <X className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Menu className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                  <div className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-50">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                      {tabs.map((tab, index) => {
                        if (tab.type === "separator") {
                          return <div key={`separator-${index}`} className="border-t border-gray-200 dark:border-gray-700 my-2" />;
                        }
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.title}
                            onClick={() => handleTabChange(index)}
                            className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                              getCurrentTabIndex() === index
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Icon className="h-5 w-5 mr-3" />
                            {tab.title}
                          </button>
                        );
                      })}
                      <button
                        onClick={signOut}
                        className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

