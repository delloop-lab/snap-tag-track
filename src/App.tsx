
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AnalyticsListener from "./components/AnalyticsListener";
import { RouteSeo } from "./components/RouteSeo";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import PostSignupAuthLanding from "./components/PostSignupAuthLanding";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AppSidebar from "./components/AppSidebar";
import ReceiptUpload from "./components/ReceiptUpload";
import ReceiptList from "./components/ReceiptList";
import ReceiptDetail from "./components/ReceiptDetail";
import ReceiptSummaryList from "./components/ReceiptSummaryList";
import DemoRegisterPromptHost from "./components/DemoRegisterPromptHost";
import Profile from "./pages/Profile";
import TagUntagged from "./pages/TagUntagged";
import LandingPage2 from "./pages/LandingPage2";
import Admin from "./pages/Admin";
import AdminReceipts from "./pages/AdminReceipts";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdSummaryMock from "./pages/AdSummaryMock";
import SeoMarketingPage from "./pages/SeoMarketingPage";
import { isSeoLandingPath } from "./marketing/seoPublicPaths";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogPostPage from "./pages/BlogPostPage";
import Taskorilla from "./pages/Taskorilla";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isClientDemoPreviewActive } from "@/lib/demo/demoMode";
import { isClientDemoReceiptId, pathnameIsClientDemoReceipt } from "@/lib/demo/clientDemoData";

/** Client-only preview: no auth, same dashboard component as signed-in users. */
function DashboardRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-800 text-slate-300">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (isClientDemoPreviewActive(user)) {
    return <Index />;
  }
  return (
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  );
}

/** Session demo can open built-in demo receipts without signing in. */
function ReceiptDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-800 text-slate-300">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (isClientDemoPreviewActive(user) && id && isClientDemoReceiptId(id)) {
    return <ReceiptDetail />;
  }
  return (
    <ProtectedRoute>
      <ReceiptDetail />
    </ProtectedRoute>
  );
}

function SummaryRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-800 text-slate-300">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (isClientDemoPreviewActive(user)) {
    return <ReceiptSummaryList />;
  }
  return (
    <ProtectedRoute>
      <ReceiptSummaryList />
    </ProtectedRoute>
  );
}

function ReceiptListRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-800 text-slate-300">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (isClientDemoPreviewActive(user)) {
    return <ReceiptList />;
  }
  return (
    <ProtectedRoute>
      <ReceiptList />
    </ProtectedRoute>
  );
}

const queryClient = new QueryClient();

const ScrollToTopOnRouteChange = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(null);
      return () => {
        active = false;
      };
    }

    setIsAdmin(null);
    void (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(data?.user_type === "admin");
    })();

    return () => {
      active = false;
    };
  }, [user]);

  if (loading || (!!user && isAdmin === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/** Standalone screenshot page — omit app chrome entirely. Not linked anywhere. */
const AD_SUMMARY_MOCK_PATH = "/ad-summary-mock";

/** Marketing-only landing URLs: never show app sidebar + marketing login chrome together */
const PublicLandingRoute = () => {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-100">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  return <LandingPage2 />;
};

const AppContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  const hideAppChrome = location.pathname === AD_SUMMARY_MOCK_PATH;
  const { pathname } = location;
  /** Same shell as signed-in users: sidebar, mobile navbar, slate background. */
  const demoPreview = isClientDemoPreviewActive(user);
  const inAppChrome =
    Boolean(user) ||
    (demoPreview &&
      (pathname === "/dashboard" ||
        pathname === "/summary" ||
        pathname === "/receipts" ||
        pathnameIsClientDemoReceipt(pathname)));
  const showNavbar = inAppChrome;
  const showDemoPreviewBanner =
    demoPreview && inAppChrome && !hideAppChrome;

  /** Marketing pages that paint their own canvas when logged out */
  const isMarketingBackdrop =
    pathname === "/help" ||
    pathname === "/contact" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === AD_SUMMARY_MOCK_PATH ||
    isSeoLandingPath(pathname) ||
    pathname.startsWith("/blog");
  const isSummaryPage = pathname === "/summary";

  const shellBgClass = inAppChrome
    ? cn(
        "min-h-screen flex",
        isSummaryPage ? "bg-app-dotted md:bg-slate-800 text-slate-100" : "bg-slate-800 text-slate-100",
      )
    : cn("min-h-screen flex", isMarketingBackdrop ? "bg-gray-50" : "bg-app-dotted");

  return (
    <div className={cn("min-h-screen flex", shellBgClass)}>
      <PostSignupAuthLanding />
      {/* Desktop sidebar */}
      {inAppChrome && !hideAppChrome && <AppSidebar />}

      {/* Main area */}
      <div className={`flex-1 min-w-0 flex flex-col ${inAppChrome && !hideAppChrome ? "md:ml-56" : ""}`}>
        {showDemoPreviewBanner && (
          <div
            className={cn(
              "fixed z-[44] flex min-h-[3.75rem] items-center justify-center border-b border-orange-700/60 bg-orange-500 px-3 py-3 text-center text-sm font-semibold leading-snug text-white shadow-md sm:min-h-[4.125rem] sm:px-4 sm:py-4 sm:text-base",
              "left-0 right-0 top-16 md:left-56 md:top-0",
            )}
            role="status"
          >
            Preview Mode • Sample receipts loaded • Read-only experience
          </div>
        )}
        {/* Mobile-only top navbar */}
        {showNavbar && !hideAppChrome && (
          <div className="md:hidden">
            <Navbar />
          </div>
        )}

        <main
          className={cn(
            "flex-1",
            hideAppChrome
              ? ""
              : showDemoPreviewBanner
                ? "pt-[calc(4rem+3.75rem)] md:pt-[4.5rem]"
                : "pt-2 md:pt-4",
          )}
        >
          <Routes>
            <Route path={AD_SUMMARY_MOCK_PATH} element={<AdSummaryMock />} />
            <Route
              path="/"
              element={
                user ? (
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                ) : (
                  <LandingPage2 />
                )
              }
            />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/upload" element={
              <ProtectedRoute>
                <ReceiptUpload />
              </ProtectedRoute>
            } />
            <Route path="/receipts" element={<ReceiptListRoute />} />
            <Route path="/receipt/:id" element={<ReceiptDetailRoute />} />
            <Route path="/summary" element={<SummaryRoute />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/tag-untagged" element={
              <ProtectedRoute>
                <TagUntagged />
              </ProtectedRoute>
            } />
            <Route path="/help" element={<Help />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/receipt-scanner-app" element={<SeoMarketingPage />} />
            <Route path="/warranty-tracker" element={<SeoMarketingPage />} />
            <Route path="/expense-tracking-without-bank" element={<SeoMarketingPage />} />
            <Route path="/contractor-expense-tracker" element={<SeoMarketingPage />} />
            <Route path="/household-spending-tracker" element={<SeoMarketingPage />} />
            <Route path="/fuel-food-spending-tracker" element={<SeoMarketingPage />} />
            <Route path="/how-it-works" element={<SeoMarketingPage />} />
            <Route path="/pricing" element={<SeoMarketingPage />} />
            <Route path="/use-cases" element={<SeoMarketingPage />} />
            <Route path="/returns-cooling-off" element={<SeoMarketingPage />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/landing" element={<PublicLandingRoute />} />
            <Route path="/landing2" element={<PublicLandingRoute />} />
            <Route path="/taskorilla" element={<Taskorilla />} />
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } />
            <Route path="/admin/receipts" element={
              <AdminRoute>
                <AdminReceipts />
              </AdminRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  useEffect(() => {
    const host = window.location.hostname;
    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1";
    const isProdLike = import.meta.env.PROD && !isLocalHost;
    if ("serviceWorker" in navigator && isProdLike) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .then((registration) => {
            void registration.update();
          })
          .catch((err) => {
            console.log("ServiceWorker registration failed:", err);
          });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTopOnRouteChange />
            <RouteSeo />
            <AnalyticsListener />
            <DemoRegisterPromptHost />
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
