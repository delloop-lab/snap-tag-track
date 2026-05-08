import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { TERMS_PUBLISHED_VERSION_ID } from "@/lib/termsVersion";
import { SIGNUP_TERMS_METADATA_KEY } from "@/lib/termsRegistrationAcceptance";
import { Eye, EyeOff } from "lucide-react";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthErrorDialogState = {
  title: string;
  message: string;
  allowWaitlist?: boolean;
};

const AUTH_REQUEST_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Request timed out. Please try again."));
    }, timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

function extractAuthErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const msg = error.message?.trim();
    if (msg && msg !== "{}" && msg !== "[object Object]") return msg;
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      const msg = maybeMessage.trim();
      if (msg && msg !== "{}" && msg !== "[object Object]") return msg;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // ignore serialization errors
    }
  }
  return "Something went wrong. Please try again.";
}

function isLikelySignupTimeout(rawMessage: string): boolean {
  const normalized = rawMessage.trim().toLowerCase();
  return (
    normalized.includes("gateway timeout") ||
    normalized.includes("timeout") ||
    normalized.includes("fetch failed") ||
    normalized.includes("request timed out")
  );
}

/** Translate raw Supabase auth error messages into actionable copy. */
function describeAuthError(rawMessage: string, mode: "signIn" | "signUp"): AuthErrorDialogState {
  const cleanedRaw = rawMessage.trim();
  const normalized = cleanedRaw.toLowerCase();

  if (mode === "signIn") {
    if (
      normalized.includes("invalid login credentials") ||
      normalized.includes("invalid_credentials") ||
      normalized.includes("invalid email or password")
    ) {
      return {
        title: "Couldn’t sign you in",
        message:
          "The email or password is incorrect. Check for typos and the Caps Lock key, then try again.",
      };
    }
    if (normalized.includes("email not confirmed")) {
      return {
        title: "Confirm your email first",
        message:
          "Open the confirmation link we sent to your inbox before signing in. You can request another from the sign-up screen if you can’t find it.",
      };
    }
    if (normalized.includes("gateway timeout") || normalized.includes("timeout")) {
      return {
        title: "Sign-in timed out",
        message: "The server took too long to respond. Please try signing in again in a moment.",
      };
    }
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already registered")
  ) {
    return {
      title: "Account already exists",
      message:
        "This email is already registered. Try signing in instead, or use ‘Forgot password’ if you can’t remember it.",
    };
  }

  if (
    normalized.includes("password should be at least") ||
    normalized.includes("password is too short")
  ) {
    return {
      title: "Password too short",
      message: "Use at least 6 characters for your password.",
    };
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return {
      title: "Too many attempts",
      message: "Please wait a minute before trying again.",
    };
  }

  if (
    normalized.includes("gateway timeout") ||
    normalized.includes("timeout") ||
    normalized.includes("fetch failed")
  ) {
    return {
      title: mode === "signIn" ? "Couldn’t sign you in" : "Sign-up is taking longer than expected",
      message:
        mode === "signUp"
          ? "We could not confirm sign-up completion yet. Check your inbox for a confirmation email, then try signing in. If no email arrives, try sign-up again in a minute."
          : "The server took too long to respond. Please try again.",
    };
  }

  return {
    title: mode === "signIn" ? "Couldn’t sign you in" : "Couldn’t complete sign-up",
    message:
      cleanedRaw && cleanedRaw !== "{}" && cleanedRaw !== "[object Object]"
        ? cleanedRaw
        : "Please try again.",
  };
}

function emailConfirmationRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

function passwordResetRedirectUrl() {
  return `${window.location.origin}/auth/reset-password`;
}

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTermsRegistration, setAcceptedTermsRegistration] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [authErrorDialog, setAuthErrorDialog] = useState<AuthErrorDialogState | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistFirstName, setWaitlistFirstName] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const navigate = useNavigate();

  const resetWaitlistState = () => {
    setWaitlistOpen(false);
    setWaitlistSubmitting(false);
    setWaitlistError("");
    setWaitlistSuccess(false);
    setWaitlistFirstName("");
    setWaitlistEmail("");
  };

  useEffect(() => {
    const savedRemember = localStorage.getItem("snap_auth_remember_me");
    if (savedRemember === "0") setRememberMe(false);
    if (savedRemember === "1") setRememberMe(true);
  }, []);

  useEffect(() => {
    if (!isSignUp) {
      setAcceptedTermsRegistration(false);
      setPendingVerificationEmail(null);
    }
  }, [isSignUp]);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleResendConfirmation = async () => {
    const addr = pendingVerificationEmail ?? email;
    if (!addr.trim()) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: addr,
        options: { emailRedirectTo: emailConfirmationRedirectUrl() },
      });
      if (error) throw error;
      toast({
        title: "Email sent",
        description: "Check your inbox for the confirmation link.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setAuthErrorDialog({
        title: "Couldn’t resend email",
        message,
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setAuthErrorDialog({
        title: "Enter your email",
        message: "Type your account email first, then choose Forgot password.",
      });
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(emailTrimmed, {
          redirectTo: passwordResetRedirectUrl(),
        }),
      );
      if (error) throw error;
      toast({
        title: "Password reset sent",
        description: "Check your inbox for the reset link.",
      });
    } catch (error: unknown) {
      const message = extractAuthErrorMessage(error);
      setAuthErrorDialog({
        title: "Couldn’t send reset email",
        message,
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem("snap_auth_remember_me", rememberMe ? "1" : "0");
    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();

    try {
      if (isSignUp && !acceptedTermsRegistration) {
        toast({
          title: "Accept terms to register",
          description: "Tick the box to confirm you agree to the Terms & Conditions and Privacy Policy.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (isSignUp) {
        // Reset stale confirmation state before each new sign-up attempt.
        setPendingVerificationEmail(null);
        const redirectTo = emailConfirmationRedirectUrl();
        const { data, error: signUpError } = await withTimeout(
          supabase.auth.signUp({
            email: emailTrimmed,
            password: passwordTrimmed,
            options: {
              emailRedirectTo: redirectTo,
              data: {
                [SIGNUP_TERMS_METADATA_KEY]: TERMS_PUBLISHED_VERSION_ID,
              },
            },
          }),
        );

        if (signUpError) throw signUpError;

        if (!data.session) {
          setPendingVerificationEmail(emailTrimmed);
          toast({
            title: "Check your email",
            description:
              "We sent a confirmation link. Open it to activate your account, then sign in here.",
          });
        } else {
          toast({
            title: "Account created successfully",
            description: "Welcome to SnapTagTrack!",
          });
          navigate("/profile?postSignup=1");
        }
      } else {
        // Regular sign in flow
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: emailTrimmed,
            password: passwordTrimmed,
          }),
        );
        
        if (error) throw error;
        
        // Redirect to home page after successful sign in
        navigate("/");
      }
    } catch (error: unknown) {
      if (isSignUp) {
        // Avoid showing an old address if this attempt fails.
        setPendingVerificationEmail(null);
      }
      const message = extractAuthErrorMessage(error);
      if (isSignUp && isLikelySignupTimeout(message)) {
        setAuthErrorDialog({
          title: "Couldn’t complete sign-up",
          message:
            "We're experiencing a high level of registrations at the moment. Please try in 15 minutes.",
          allowWaitlist: true,
        });
        setWaitlistEmail(emailTrimmed);
        return;
      }
      setAuthErrorDialog(describeAuthError(message, isSignUp ? "signUp" : "signIn"));
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistSubmit = async () => {
    const first = waitlistFirstName.trim();
    const addr = waitlistEmail.trim();
    setWaitlistError("");
    setWaitlistSuccess(false);
    if (!first || !addr) {
      setWaitlistError("Please enter your first name and email.");
      return;
    }
    setWaitlistSubmitting(true);
    try {
      const response = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: first,
          email: addr,
          source: "auth-timeout-modal",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        throw new Error(
          typeof payload?.error === "string" && payload.error
            ? payload.error
            : "Could not add you to the waitlist right now.",
        );
      }
      setWaitlistSuccess(true);
      setWaitlistError("");
      toast({
        title: "Added to waitlist",
        description: "Thanks — we’ll contact you as soon as capacity opens up.",
      });
    } catch (error) {
      setWaitlistError(error instanceof Error ? error.message : "Could not add you to the waitlist right now.");
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  return (
    <>
    <Dialog
      open={authErrorDialog !== null}
      onOpenChange={(open) => {
        if (!open) {
          setAuthErrorDialog(null);
          resetWaitlistState();
        }
      }}
    >
      <DialogContent className="max-w-sm border-slate-600 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>{authErrorDialog?.title ?? "Error"}</DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-relaxed text-slate-300">
            {authErrorDialog?.message}
          </DialogDescription>
        </DialogHeader>
        {authErrorDialog?.allowWaitlist && (
          <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-950/40 p-3">
            {!waitlistOpen ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-500 bg-slate-900 text-slate-100 hover:bg-slate-800"
                onClick={() => setWaitlistOpen(true)}
              >
                Add yourself to the waiting list
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-first-name" className="text-slate-300">
                    First name
                  </Label>
                  <Input
                    id="waitlist-first-name"
                    value={waitlistFirstName}
                    onChange={(e) => setWaitlistFirstName(e.target.value)}
                    autoComplete="given-name"
                    className="h-10 border-slate-500 bg-slate-900 text-slate-100 placeholder:text-slate-400"
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-email" className="text-slate-300">
                    Email
                  </Label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    autoComplete="email"
                    className="h-10 border-slate-500 bg-slate-900 text-slate-100 placeholder:text-slate-400"
                    placeholder="Email"
                  />
                </div>
                {!!waitlistError && <p className="text-xs text-red-300">{waitlistError}</p>}
                {waitlistSuccess && <p className="text-xs text-green-300">You’re on the waitlist.</p>}
                <Button
                  type="button"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={() => void handleWaitlistSubmit()}
                  disabled={waitlistSubmitting}
                >
                  {waitlistSubmitting ? "Adding..." : "Join waiting list"}
                </Button>
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => {
              setAuthErrorDialog(null);
              resetWaitlistState();
            }}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <div className="flex min-h-screen w-full flex-col bg-slate-800 text-slate-100">
      <div className={`${marketingPageGutterClass} pb-2`}>
        <MarketingTopNav active="auth" className="mb-6 sm:mb-8" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-6 pb-28 sm:px-6">
      <div className="relative w-full max-w-md space-y-8 overflow-hidden rounded-xl border border-slate-600 bg-slate-900/70 p-8 text-slate-100 shadow-2xl backdrop-blur-sm">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-sky-900/30 blur-3xl opacity-70" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-orange-900/30 blur-3xl opacity-70" />
        
        <div className="relative text-center">
          <img 
            src="/SnapTagTrack.png" 
            alt="SnapTagTrack Logo" 
            className="w-48 h-auto mx-auto mb-4"
          />
          <p className="mt-2 text-sm font-medium text-slate-300">
            {pendingVerificationEmail
              ? "Confirm your email"
              : isSignUp
                ? "Create your account"
                : "Sign in to your account"}
          </p>
        </div>

        {pendingVerificationEmail ? (
          <div className="relative mt-8 space-y-6 text-center">
            <p className="text-sm leading-relaxed text-slate-300">
              We sent a link to{" "}
              <span className="font-medium text-white">{pendingVerificationEmail}</span>. Click it to
              confirm your address, then return here to sign in.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full border-slate-500 bg-slate-950/70 text-slate-100 hover:bg-slate-800 hover:text-white"
              disabled={resendLoading}
              onClick={() => void handleResendConfirmation()}
            >
              {resendLoading ? "Sending…" : "Resend confirmation email"}
            </Button>
            <button
              type="button"
              className="text-sm font-medium text-sky-300 transition-colors hover:text-sky-200"
              onClick={() => {
                setPendingVerificationEmail(null);
                setIsSignUp(false);
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
        <form className="mt-8 space-y-6 relative" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                required
                className="h-11 border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-200">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  className="h-11 border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-600 bg-slate-950/50 p-3">
                <input
                  id="acceptedTermsRegistration"
                  type="checkbox"
                  checked={acceptedTermsRegistration}
                  onChange={(e) => setAcceptedTermsRegistration(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-500 bg-slate-900 text-orange-500 focus:ring-orange-400"
                />
                <Label htmlFor="acceptedTermsRegistration" className="text-sm font-normal leading-relaxed text-slate-300 cursor-pointer select-none">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]">
                    Terms &amp; Conditions
                  </Link>
                  {" "}and{" "}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]">
                    Privacy Policy
                  </Link>
                  .
                </Label>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="mr-2 h-4 w-4 rounded border-slate-500 bg-slate-900 text-orange-500 focus:ring-orange-400"
                />
                <Label htmlFor="rememberMe" className="text-sm text-slate-300">Remember Me</Label>
              </div>
              {!isSignUp && (
                <button
                  type="button"
                  className="text-sm font-medium text-sky-300 transition-colors hover:text-sky-200"
                  onClick={() => void handleForgotPassword()}
                  disabled={forgotLoading || loading}
                >
                  {forgotLoading ? "Sending reset link..." : "Forgot password?"}
                </button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-orange-500 font-medium text-white shadow-md transition-all duration-200 hover:bg-orange-600 hover:shadow-lg"
            disabled={loading || (isSignUp && !acceptedTermsRegistration)}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : isSignUp ? "Sign Up" : "Sign In"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm font-medium text-sky-300 transition-colors hover:text-sky-200"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>
          </div>
          {!isSignUp && (
            <p className="text-center text-xs text-slate-500">
              By signing in, you agree to{" "}
              <Link to="/terms" className="text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]">
                Terms
              </Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]">
                Privacy
              </Link>
              .
            </p>
          )}
        </form>
        )}
      </div>
      </div>
    </div>
    <SiteFooter variant="slate" />
    </>
  );
};

export default AuthPage;
