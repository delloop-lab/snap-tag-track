import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Receipt, FileText, User, HelpCircle, LogOut, Camera, Shield, Mail } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Receipts", icon: Receipt, path: "/receipts" },
  { label: "Summary", icon: FileText, path: "/summary" },
  { label: "Profile", icon: User, path: "/profile" },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
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

  return (
    <aside className="hidden md:flex flex-col w-56 fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-40">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <Link to="/landing2">
          <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-8 w-auto" />
        </Link>
      </div>

      {/* Snap CTA */}
      <div className="px-4 py-4">
        <button
          onClick={() => navigate("/upload")}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          <Camera className="w-4 h-4" />
          Snap Receipt
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname.startsWith("/admin")
                ? "bg-orange-50 text-orange-600"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            Admin
          </Link>
        )}
        <Link
          to="/help"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname.startsWith("/help")
              ? "bg-orange-50 text-orange-600"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          Help
        </Link>
        <Link
          to="/contact"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname.startsWith("/contact")
              ? "bg-orange-50 text-orange-600"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Mail className="w-5 h-5 flex-shrink-0" />
          Contact
        </Link>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6 pt-2 border-t border-gray-100">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
