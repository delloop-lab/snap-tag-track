import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Receipt,
  FileText,
  User,
  HelpCircle,
  Shield,
  Mail,
  LogOut,
  ScrollText,
  ShieldCheck,
  MonitorPlay,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  dashboardHomePath,
  exitClientDemoMode,
  isClientDemoPreviewActive,
  setPreviewModeForDashboard,
} from "@/lib/demo/demoMode";
import { openDemoRegisterPrompt } from "@/components/DemoRegisterPromptHost";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navItems = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "Receipts", icon: Receipt, path: "/receipts" },
  { label: "Summary", icon: FileText, path: "/summary" },
  { label: "Profile", icon: User, path: "/profile" },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const dashboardPath = dashboardHomePath(Boolean(user));
  const isDemoPreview = isClientDemoPreviewActive(user);
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewDashboardDialogOpen, setPreviewDashboardDialogOpen] = useState(false);

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
          const to = path === "/" ? dashboardPath : path;
          const isActive =
            path === "/"
              ? location.pathname === "/" || location.pathname === "/dashboard"
              : location.pathname.startsWith(path);
          return (
            <Link
              key={label}
              to={to}
              onClick={(e) => {
                if (label === "Profile" && isDemoPreview) {
                  e.preventDefault();
                  openDemoRegisterPrompt(
                    "Profile",
                    "Create a free account to set your name, avatar, and shopping preferences.",
                  );
                }
              }}
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
          Help Centre
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
        <Link
          to="/terms"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            location.pathname.startsWith("/terms") ? activeLink : inactiveLink
          }`}
        >
          <ScrollText className="h-5 w-5 shrink-0" />
          Terms
        </Link>
        <Link
          to="/privacy"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            location.pathname.startsWith("/privacy") ? activeLink : inactiveLink
          }`}
        >
          <ShieldCheck className="h-5 w-5 shrink-0" />
          Privacy
        </Link>
        {user && (
          <button
            type="button"
            onClick={() => setPreviewDashboardDialogOpen(true)}
            className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-yellow-300 transition-colors hover:bg-slate-800 hover:text-yellow-200"
          >
            <MonitorPlay className="h-5 w-5 shrink-0 text-yellow-300" />
            View Demo Dashboard
          </button>
        )}
      </nav>
      {(user || isDemoPreview) && (
        <div className="px-3 pb-4 pt-2">
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                exitClientDemoMode();
                navigate("/");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-orange-300 transition-colors hover:bg-slate-800 hover:text-orange-200"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Exit preview
            </button>
          )}
        </div>
      )}

      <AlertDialog open={previewDashboardDialogOpen} onOpenChange={setPreviewDashboardDialogOpen}>
        <AlertDialogContent className="border-slate-600 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">View Demo Dashboard</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              To view the demo dashboard with sample receipts, you will be signed out of your account. You can sign in
              again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => {
                setPreviewModeForDashboard();
                void signOut({ redirectTo: "/dashboard" });
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
