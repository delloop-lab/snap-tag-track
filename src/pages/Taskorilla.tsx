import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const TASKORILLA_PLACEHOLDER_URL = "https://taskorilla.com";
const TASKORILLA_LOGO_URL = "/taskorilla-logo.png";
const INVALID_LINK_MESSAGE = "This link is invalid or has expired. Please return to Taskorilla.";
const CREATE_ACCOUNT_ERROR_MESSAGE = "We couldn’t create your account. Please try again.";

type VerifiedTaskorillaUser = {
  name: string;
  email: string;
};

const Taskorilla = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<VerifiedTaskorillaUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!token) {
      setError(INVALID_LINK_MESSAGE);
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify-taskorilla-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          throw new Error("Token verification failed");
        }

        const data = (await response.json()) as Partial<VerifiedTaskorillaUser> & { valid?: boolean };
        if (!data.valid || !data.name || !data.email) {
          throw new Error("Missing verified identity payload");
        }

        setUser({
          name: data.name,
          email: data.email,
        });
        setError("");
      } catch {
        setError(INVALID_LINK_MESSAGE);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void verifyToken();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-900/75 p-8 text-center shadow-2xl">
          <img src={TASKORILLA_LOGO_URL} alt="Taskorilla" className="mx-auto h-10 w-auto" />
          <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Partner onboarding</p>
          <h1 className="mt-4 text-2xl font-semibold">Welcome to SnapTagTrack</h1>
          <p className="mt-6 text-sm text-slate-200">Checking your Taskorilla invite…</p>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            <span>Verifying secure handoff…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-900/75 p-8 text-center shadow-2xl">
          <img src={TASKORILLA_LOGO_URL} alt="Taskorilla" className="mx-auto h-10 w-auto" />
          <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Partner onboarding</p>
          <h1 className="mt-4 text-2xl font-semibold">Welcome to SnapTagTrack</h1>
          <p className="mt-4 text-sm text-slate-300">{error || INVALID_LINK_MESSAGE}</p>
          <Button asChild className="mt-6 bg-orange-500 hover:bg-orange-600">
            <a href={TASKORILLA_PLACEHOLDER_URL}>Back to Taskorilla</a>
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedPassword) {
      setFormError("Password is required.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      if (import.meta.env.DEV) {
        console.log("TASKORILLA_REGISTER_FETCH_TRIGGERED", {
          endpoint: "/api/auth/register-from-taskorilla",
          method: "POST",
          bodyKeys: ["name", "email", "password", "source"],
        });
      }

      const response = await fetch("/api/auth/register-from-taskorilla", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: trimmedPassword,
          source: "taskorilla",
        }),
      });

      if (import.meta.env.DEV) {
        const raw = await response.clone().text();
        console.log("TASKORILLA_REGISTER_RESPONSE", {
          status: response.status,
          ok: response.ok,
          body: raw,
        });
      }

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const signInResult = await supabase.auth.signInWithPassword({
        email: user.email,
        password: trimmedPassword,
      });
      if (signInResult.error) {
        throw new Error("Auto sign-in failed");
      }

      setPassword("");
      setConfirmPassword("");
      navigate("/dashboard");
    } catch {
      setFormError(CREATE_ACCOUNT_ERROR_MESSAGE);
      setPassword("");
      setConfirmPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  // NEXT STEP:
  // - add profile completion fields if required by onboarding
  // - track onboarding completion analytics events
  // - route users to first-time product walkthrough

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-900/75 p-8 text-center shadow-2xl">
        <img src={TASKORILLA_LOGO_URL} alt="Taskorilla" className="mx-auto h-10 w-auto" />
        <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Partner onboarding</p>
        <h1 className="mt-4 text-2xl font-semibold">Welcome from Taskorilla, {user.name}</h1>
        <p className="mt-3 text-sm text-slate-300">
          You&apos;re one step away from activating your SnapTagTrack account.
        </p>
        <form className="mt-6 space-y-4 text-left" onSubmit={handleCreateAccount}>
          <h2 className="text-center text-lg font-semibold text-slate-100">Create your password</h2>
          <div className="space-y-2">
            <Label htmlFor="taskorilla-password" className="text-slate-200">
              Password
            </Label>
            <Input
              id="taskorilla-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskorilla-confirm-password" className="text-slate-200">
              Confirm Password
            </Label>
            <Input
              id="taskorilla-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="border-slate-500 bg-slate-950/70 text-slate-100 placeholder:text-slate-400"
            />
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Creating your account..." : "Create My Account"}
          </Button>
          <p className="text-center text-xs text-slate-400">
            Your details are securely transferred from Taskorilla.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Taskorilla;
