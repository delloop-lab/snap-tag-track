import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { runPostAuthLandingOnce } from "@/lib/postAuthLanding";

function isRecoveryRedirect() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("type") === "recovery" || hash.get("type") === "recovery";
}

/** Handles Supabase email-confirmation (and OAuth) redirects; tokens are parsed from the URL by the client. */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await new Promise((r) => setTimeout(r, 0));
      if (isRecoveryRedirect()) {
        const suffix = `${window.location.search}${window.location.hash}`;
        navigate(`/auth/reset-password${suffix}`, { replace: true });
        return;
      }
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        setMessage("Could not complete sign-in.");
        console.error("auth callback getSession:", error);
        toast({
          title: "Sign-in failed",
          description: error.message,
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
        return;
      }
      if (session) {
        const handled = await runPostAuthLandingOnce(
          supabase,
          navigate,
          session.user.id,
        );
        if (!handled) navigate("/", { replace: true });
        return;
      }
      toast({
        title: "Link expired or invalid",
        description: "Request a new confirmation email after signing up.",
        variant: "destructive",
      });
      setMessage("Redirecting…");
      navigate("/auth", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center text-slate-200">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent"
        aria-hidden
      />
      <p className="mt-4 text-sm text-slate-400">{message}</p>
    </div>
  );
};

export default AuthCallback;
