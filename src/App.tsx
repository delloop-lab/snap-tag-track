import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import ReceiptUpload from "./components/ReceiptUpload";
import ReceiptList from "./components/ReceiptList";
import ReceiptDetail from "./components/ReceiptDetail";
import ReceiptSummaryList from "./components/ReceiptSummaryList";
import Profile from "./pages/Profile";
import TagUntagged from "./pages/TagUntagged";
import Landing from "./pages/Landing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <div className="pt-4">
            <Routes>
              <Route path="/" element={<Index />} />
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
              <Route path="/landing" element={<Landing />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
