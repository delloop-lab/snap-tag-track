import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { TERMS_PUBLISHED_VERSION_ID } from "@/lib/termsVersion";
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTermsRegistration, setAcceptedTermsRegistration] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignUp) setAcceptedTermsRegistration(false);
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Use sessionStorage if Remember Me is unchecked
    let authClient = supabase;
    if (!rememberMe) {
      // Create a new Supabase client with session storage
      authClient = createClient(
        import.meta.env.VITE_SUPABASE_URL || '',
        import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        {
          auth: {
            storage: window.sessionStorage,
          },
        }
      );
    }

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
        // For sign up, first register the user
        const { error } = await authClient.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        // Immediately sign in the user after signup
        const { error: signInError } = await authClient.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;

        const { data: userData } = await authClient.auth.getUser();
        const uid = userData.user?.id;
        if (uid) {
          const { error: logErr } = await authClient.from("terms_registration_acceptances").insert({
            user_id: uid,
            terms_version: TERMS_PUBLISHED_VERSION_ID,
            signup_context: "registration",
          });
          if (logErr) {
            console.error("terms_registration_acceptances insert:", logErr);
            toast({
              title: "Account created",
              description:
                "We could not store your Terms acceptance on the server. Your account works; please contact support if this keeps happening.",
            });
          } else {
            toast({
              title: "Account created successfully",
              description: "Welcome to SnapTagTrack!",
            });
          }
        } else {
          toast({
            title: "Account created successfully",
            description: "Welcome to SnapTagTrack!",
          });
        }

        navigate("/");
      } else {
        // Regular sign in flow
        const { error } = await authClient.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        // Redirect to home page after successful sign in
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="relative flex min-h-screen w-full items-center justify-center bg-slate-800 px-4 py-12 pb-28 text-slate-100">
      <Link
        to="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-200 shadow-md transition-colors hover:bg-slate-700 hover:text-white md:left-6 md:top-6"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Back
      </Link>
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
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

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
              By signing in you agree to our{" "}
              <Link to="/terms" className="text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]">
                Terms &amp; Conditions
              </Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </form>
      </div>
    </div>
    <SiteFooter variant="slate" />
    </>
  );
};

export default AuthPage;
