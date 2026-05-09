
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureTermsSignupAcceptanceRecorded } from "@/lib/termsRegistrationAcceptance";
import { resetPostAuthLandingGuard } from "@/lib/postAuthLanding";
import {
  clearClientDemoModeForAuthenticatedUser,
  exitClientDemoMode,
} from "@/lib/demo/demoMode";

/** Remove persisted Supabase auth keys so a full reload cannot resurrect the session. */
function wipeSupabaseAuthStorage() {
  const storages: Storage[] = [localStorage, sessionStorage];
  for (const storage of storages) {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith("sb-")) continue;
      if (key.includes("auth-token") || key.includes("auth-code-verifier")) {
        keys.push(key);
      }
    }
    for (const key of keys) storage.removeItem(key);
  }
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: (options?: { redirectTo?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === "SIGNED_OUT") {
          resetPostAuthLandingGuard();
        }

        const nextUser = currentSession?.user ?? null;
        if (nextUser) {
          clearClientDemoModeForAuthenticatedUser();
        }

        setSession(currentSession);
        setUser(nextUser);
        setLoading(false);
        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          currentSession?.user
        ) {
          // Defer: avoid calling Supabase from inside this callback (deadlock risk).
          setTimeout(() => {
            void ensureTermsSignupAcceptanceRecorded(supabase, currentSession.user);
          }, 0);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      const nextUser = currentSession?.user ?? null;
      if (nextUser) {
        clearClientDemoModeForAuthenticatedUser();
      }
      setSession(currentSession);
      setUser(nextUser);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async (options?: { redirectTo?: string }) => {
    const redirectTo = options?.redirectTo ?? "/";
    resetPostAuthLandingGuard();
    // Drop local session immediately so chrome (sidebar) disappears.
    setSession(null);
    setUser(null);
    setLoading(false);
    try {
      // `local` clears persisted session first so the next reload never sees stale tokens.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) console.error("signOut local:", error);
    } catch (e) {
      console.error("signOut:", e);
    }
    wipeSupabaseAuthStorage();
    // Server-side refresh-token revoke — do not await (network must not trap logout).
    void supabase.auth.signOut({ scope: "global" }).catch(() => {});
    if (redirectTo === "/") {
      exitClientDemoMode();
    }
    window.location.replace(redirectTo);
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;
