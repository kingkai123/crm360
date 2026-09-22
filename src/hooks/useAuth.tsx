import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "sales_manager" | "sales_executive";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  must_setup: boolean;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isPrivileged: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  isPrivileged: false,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, job_title, must_setup")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((p as Profile) ?? null);
    const roles = (r ?? []).map((x) => x.role as AppRole);
    setRole(
      roles.includes("admin")
        ? "admin"
        : roles.includes("sales_manager")
          ? "sales_manager"
          : roles.includes("sales_executive")
            ? "sales_executive"
            : null,
    );
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setTimeout(() => void loadDetails(s?.user?.id), 0);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadDetails(data.session?.user?.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    user: session?.user ?? null,
    session,
    profile,
    role,
    loading,
    isPrivileged: role === "admin" || role === "sales_manager",
    refresh: async () => loadDetails(session?.user?.id),
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setRole(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const roleLabel: Record<AppRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
};
