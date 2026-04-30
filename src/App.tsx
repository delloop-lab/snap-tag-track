
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AppSidebar from "./components/AppSidebar";
import ReceiptUpload from "./components/ReceiptUpload";
import ReceiptList from "./components/ReceiptList";
import ReceiptDetail from "./components/ReceiptDetail";
import ReceiptSummaryList from "./components/ReceiptSummaryList";
import Profile from "./pages/Profile";
import TagUntagged from "./pages/TagUntagged";
import LandingPage2 from "./pages/LandingPage2";
import Admin from "./pages/Admin";
import AdminReceipts from "./pages/AdminReceipts";
import Help from "./pages/Help";
import VersionNumber from "./components/VersionNumber";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

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

const AppContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  const showNavbar = user || location.pathname !== "/";

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      {user && <AppSidebar />}

      {/* Main area */}
      <div className={`flex-1 min-w-0 flex flex-col ${user ? "md:ml-56" : ""}`}>
        {/* Mobile-only top navbar */}
        {showNavbar && (
          <div className="md:hidden">
            <Navbar />
          </div>
        )}

        <main className="flex-1 pt-2 md:pt-4">
          <Routes>
            <Route path="/" element={user ? <Index /> : <LandingPage2 />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/upload" element={
              <ProtectedRoute>
                <ReceiptUpload />
              </ProtectedRoute>
            } />
            <Route path="/receipts" element={
              <ProtectedRoute>
                <ReceiptList />
              </ProtectedRoute>
            } />
            <Route path="/receipt/:id" element={
              <ProtectedRoute>
                <ReceiptDetail />
              </ProtectedRoute>
            } />
            <Route path="/summary" element={
              <ProtectedRoute>
                <ReceiptSummaryList />
              </ProtectedRoute>
            } />
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
            <Route path="/help" element={
              <ProtectedRoute>
                <Help />
              </ProtectedRoute>
            } />
            <Route path="/landing" element={<LandingPage2 />} />
            <Route path="/landing2" element={<LandingPage2 />} />
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

        <VersionNumber />
      </div>
    </div>
  );
};

const App = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
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
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
