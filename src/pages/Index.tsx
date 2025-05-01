
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/receipts");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full text-center p-6">
        <h1 className="text-4xl font-bold mb-4">SnapTagForget</h1>
        <p className="text-xl text-gray-600 mb-8">
          Capture receipts, extract text, and never worry about losing them again.
        </p>
        <div className="space-y-4">
          <Button 
            size="lg"
            className="w-full" 
            onClick={() => navigate("/auth")}
          >
            Get Started
          </Button>
          <p className="text-sm text-gray-500">
            Upload receipts and extract text automatically with OCR technology.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
