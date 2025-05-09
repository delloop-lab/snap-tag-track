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
import ReceiptUpload from "./components/ReceiptUpload";
import ReceiptList from "./components/ReceiptList";
import ReceiptDetail from "./components/ReceiptDetail";
import ReceiptSummaryList from "./components/ReceiptSummaryList";
import Profile from "./pages/Profile";
import TagUntagged from "./pages/TagUntagged";
import LandingPage2 from "./pages/LandingPage2";
import Admin from "./pages/Admin";
import AdminReceipts from "./pages/AdminReceipts";
import { useEffect } from "react";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  const showNavbar = user || location.pathname !== "/";

  return (
    <>
      {showNavbar && <Navbar />}
      <div className="pt-4">
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
          <Route path="/landing" element={<LandingPage2 />} />
          <Route path="/landing2" element={<LandingPage2 />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/receipts" element={<AdminReceipts />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
};

const App = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('ServiceWorker registration successful');
        }).catch(err => {
          console.log('ServiceWorker registration failed: ', err);
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
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
