import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { runPostAuthLandingOnce } from "@/lib/postAuthLanding";

/**
 * Email/OAuth confirmations often redirect to `/` with tokens in the fragment. AuthCallback handles `/auth/callback`;
 * this covers all other authenticated routes once the Supabase session is ready.
 */
const PostSignupAuthLanding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;

  useEffect(() => {
    if (
      loading ||
      !user ||
      pathname === "/auth/callback" ||
      pathname === "/auth/reset-password"
    ) {
      return;
    }
    void runPostAuthLandingOnce(supabase, navigate, user.id);
  }, [loading, user, pathname, navigate]);

  return null;
};

export default PostSignupAuthLanding;
