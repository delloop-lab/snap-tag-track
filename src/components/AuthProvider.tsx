
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  signOut: () => Promise<void>;
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
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
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
    window.location.replace("/");
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
