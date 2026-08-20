import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "user" | "admin";

type AuthValue = {
  session: Session | null;
  user: User | null;
  role: Role | null;
  displayName: string | null;
  loading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  role: null,
  displayName: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setRole(null);
        setDisplayName(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const [roles, profile] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const list = (roles.data ?? []).map((r) => r.role as Role);
      setRole(list.includes("admin") ? "admin" : list.length ? "user" : "user");
      setDisplayName(profile.data?.display_name || null);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        displayName,
        loading,
        isAdmin: role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
