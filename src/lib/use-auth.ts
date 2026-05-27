import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "mahasiswa" | "dosen" | "staf" | "admin";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  profile: { full_name: string; nim_nip: string | null; phone: string | null } | null;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setRoles([]);
      setProfile(null);
      return;
    }
    const uid = session.user.id;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .then(({ data }) => setRoles((data ?? []).map((r) => r.role as AppRole)));
    supabase
      .from("profiles")
      .select("full_name, nim_nip, phone")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
  }, [session?.user?.id]);

  return {
    loading,
    session,
    user: session?.user ?? null,
    roles,
    profile,
  };
}

export function hasAnyRole(roles: AppRole[], target: AppRole[]) {
  return roles.some((r) => target.includes(r));
}