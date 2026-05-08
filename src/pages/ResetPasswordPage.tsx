import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";

const EXPECTED_RECOVERY_FLOW_KEY = "snap_expected_recovery_flow";

function hasRecoveryParams() {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const query = url.searchParams;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    query.get("type") === "recovery" ||
    hash.get("type") === "recovery" ||
    hash.has("access_token") ||
    query.has("code")
  );
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validLink, setValidLink] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(EXPECTED_RECOVERY_FLOW_KEY);
    let active = true;
    if (!hasRecoveryParams()) {
      setValidLink(false);
      setLoadingSession(false);
      return () => {
        active = false;
      };
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setValidLink(Boolean(currentSession));
        setLoadingSession(false);
      }
    });

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      setValidLink(Boolean(session));
      setLoadingSession(false);
    })();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const passwordError = useMemo(() => {
    if (!password) return "";
    if (password.length < 6) return "Use at least 6 characters.";
    if (confirmPassword && password !== confirmPassword) return "Passwords do not match.";
    return "";
  }, [password, confirmPassword]);

  const canSubmit = password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: "Password updated",
        description: "Your password has been reset. Please sign in again.",
      });
      await supabase.auth.signOut({ scope: "local" });
      navigate("/auth", { replace: true });
    } catch (error) {
      toast({
        title: "Couldn’t reset password",
        description: error instanceof Error ? error.message : "Please request a new reset link.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-800 text-slate-100">
      <div className={`${marketingPageGutterClass} pb-2`}>
        <MarketingTopNav active="auth" className="mb-6 sm:mb-8" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-6 pb-28 sm:px-6">
        <div className="relative w-full max-w-md space-y-6 overflow-hidden rounded-xl border border-slate-600 bg-slate-900/70 p-8 text-slate-100 shadow-2xl backdrop-blur-sm">
          <div className="relative text-center">
            <img src="/SnapTagTrack.png" alt="SnapTagTrack Logo" className="mx-auto mb-4 h-auto w-48" />
            <p className="mt-2 text-sm font-medium text-slate-300">Set a new password</p>
          </div>

          {loadingSession ? (
            <p className="text-center text-sm text-slate-400">Checking reset link...</p>
          ) : !validLink ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-300">This password reset link is invalid or expired.</p>
              <Link className="text-sm font-medium text-sky-300 hover:text-sky-200" to="/auth">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-slate-200">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="h-11 border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-200">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  className="h-11 border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
                />
              </div>
              {!!passwordError && <p className="text-xs text-red-300">{passwordError}</p>}
              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-orange-500 font-medium text-white hover:bg-orange-600"
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
      <SiteFooter variant="slate" />
    </div>
  );
}
