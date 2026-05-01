import { Link, useLocation } from "react-router-dom";
import { Home, Receipt, FileText, User, HelpCircle, Shield, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "Receipts", icon: Receipt, path: "/receipts" },
  { label: "Summary", icon: FileText, path: "/summary" },
  { label: "Profile", icon: User, path: "/profile" },
];

export default function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      return () => {
        active = false;
      };
    }

    void (async () => {
      const { data } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setIsAdmin(data?.user_type === "admin");
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const inactiveLink =
    "text-slate-300 hover:bg-slate-700 hover:text-white";
  const activeLink = "bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/35";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-slate-600 bg-slate-900 md:flex">
      <div className="flex h-16 items-center border-b border-slate-600 px-4">
        <Link to="/landing2" className="block">
          <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-8 w-auto brightness-110" />
        </Link>
      </div>

      <nav className="space-y-0.5 overflow-y-auto px-3 py-2">
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive =
            path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? activeLink : inactiveLink
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname.startsWith("/admin") ? activeLink : inactiveLink
            }`}
          >
            <Shield className="h-5 w-5 shrink-0" />
            Admin
          </Link>
        )}
        <Link
          to="/help"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            location.pathname.startsWith("/help") ? activeLink : inactiveLink
          }`}
        >
          <HelpCircle className="h-5 w-5 shrink-0" />
          Help
        </Link>
        <Link
          to="/contact"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            location.pathname.startsWith("/contact") ? activeLink : inactiveLink
          }`}
        >
          <Mail className="h-5 w-5 shrink-0" />
          Contact
        </Link>
      </nav>
      {user && (
        <div className="px-3 pb-4 pt-2">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}
