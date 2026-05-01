import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Home, Receipt, LogOut, User, FileText, Menu, X, HelpCircle, Shield, Mail } from "lucide-react";
import { ExpandableTabs } from "./ui/expandable-tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
    { title: "Dashboard", icon: Home, type: "tab" as const },
    { title: "Receipts", icon: Receipt, type: "tab" as const },
    { title: "Summary", icon: FileText, type: "tab" as const },
    ...(isAdmin ? [{ title: "Admin", icon: Shield, type: "tab" as const }] : []),
    { type: "separator" as const },
    { title: "Profile", icon: User, type: "tab" as const },
    { title: "Help", icon: HelpCircle, type: "tab" as const },
    { title: "Contact", icon: Mail, type: "tab" as const },
  ];

  const routeForTabTitle = (title: string): string | null => {
    switch (title) {
      case "Dashboard":
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
      case "Contact":
        return "/contact";
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
        route === "/"
          ? location.pathname === "/"
          : route === "/help" || route === "/contact"
            ? location.pathname === route
            : location.pathname.startsWith(route);
      if (match) return i;
    }
    return 0;
  };

  return (
    <nav
      className={cn(
        "relative z-40 md:hidden border-b shadow-md",
        user ? "border-slate-600 bg-slate-800 shadow-black/20" : "border-transparent bg-white",
      )}
    >
      {showProfilePrompt && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg border border-slate-500 bg-slate-900 px-4 py-3 text-slate-100 shadow-lg">
          <div className="flex items-center">
            <User className="mr-2 h-5 w-5 text-[#7CB87E]" />
            <p className="text-sm">Complete your profile to get the most out of SnapTagTrack!</p>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="ml-4 rounded-lg bg-orange-500 px-3 py-1 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Complete Now
            </button>
          </div>
        </div>
      )}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-h-16 flex-nowrap items-center justify-between gap-3">
          <div className="flex min-w-0 shrink-0 items-center">
            <Link to="/landing2" className="flex shrink-0 items-center">
              <img
                className={cn("h-8 w-auto max-h-8", user && "brightness-110")}
                src="/SnapTagTrack.png"
                alt="SnapTagTrack"
              />
            </Link>
          </div>

          <div className="flex shrink-0 items-center">
            {user ? (
              <>
                <div className="hidden items-center space-x-4 md:flex">
                  <ExpandableTabs
                    tabs={tabs}
                    className="border-slate-600"
                    activeColor="text-orange-400"
                    onChange={handleTabChange}
                    defaultSelected={getCurrentTabIndex()}
                  />
                  <button
                    type="button"
                    onClick={signOut}
                    className="inline-flex items-center rounded-md border border-transparent bg-orange-500 px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>

                <div className="md:hidden">
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                  >
                    <span className="sr-only">Open main menu</span>
                    {isMenuOpen ? (
                      <X className="block h-6 w-6 shrink-0" aria-hidden />
                    ) : (
                      <Menu className="block h-6 w-6 shrink-0" aria-hidden />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex max-w-[min(100%,26rem)] flex-nowrap items-center gap-1.5 overflow-x-auto sm:gap-2">
                <Link
                  to="/help"
                  className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:px-3 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Help
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:px-3 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Contact
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-transparent bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 sm:px-4 sm:text-sm"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>

        {user && isMenuOpen && (
          <div className="absolute inset-x-0 top-full z-50 border-b border-slate-600 bg-slate-900 shadow-xl md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {tabs.map((tab, index) => {
                if (tab.type === "separator") {
                  return <div key={`separator-${index}`} className="my-2 border-t border-slate-600" />;
                }
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.title}
                    type="button"
                    onClick={() => handleTabChange(index)}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium",
                      getCurrentTabIndex() === index
                        ? "bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/35"
                        : "text-slate-200 hover:bg-slate-800",
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5 shrink-0" />
                    {tab.title}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-orange-400 hover:bg-slate-800"
              >
                <LogOut className="mr-3 h-5 w-5 shrink-0" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

