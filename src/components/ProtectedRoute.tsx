
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setCheckingProfile(false);
      setProfileIncomplete(false);
      return () => {
        active = false;
      };
    }

    setCheckingProfile(true);
    void (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name, country")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setProfileIncomplete(true);
        setCheckingProfile(false);
        return;
      }

      const missingFirst = !data.first_name?.trim();
      const missingLast = !data.last_name?.trim();
      const missingCountry = !data.country?.trim();
      setProfileIncomplete(missingFirst || missingLast || missingCountry);
      setCheckingProfile(false);
    })();

    return () => {
      active = false;
    };
  }, [user, location.pathname]);

  if (loading || checkingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileIncomplete && location.pathname !== "/profile") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-slate-900">Complete your profile</h2>
          <p className="mt-2 text-sm text-slate-700">
            Please add your first name, last name, and country before continuing.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={() => navigate("/profile?completeProfile=1", { replace: true })}
          >
            Go to Profile
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
