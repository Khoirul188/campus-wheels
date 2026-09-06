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
  // sessionLoading: menandai proses ambil sesi login sudah selesai atau belum.
  // rolesLoading: menandai proses ambil role & profile (untuk sesi saat ini) sudah selesai atau belum.
  // "loading" yang dikembalikan ke komponen adalah gabungan keduanya, supaya
  // halaman tidak sempat menampilkan "Akses ditolak" sesaat sebelum roles-nya
  // benar-benar selesai dimuat dari server (race condition).
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setRoles([]);
      setProfile(null);
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    const uid = session.user.id;
    Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase
        .from("profiles")
        .select("full_name, nim_nip, phone")
        .eq("id", uid)
        .maybeSingle(),
    ]).then(([rolesRes, profileRes]) => {
      setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
      setProfile(profileRes.data ?? null);
      setRolesLoading(false);
    });
  }, [session?.user?.id]);

  return {
    loading: sessionLoading || rolesLoading,
    session,
    user: session?.user ?? null,
    roles,
    profile,
  };
}

export function hasAnyRole(roles: AppRole[], target: AppRole[]) {
  return roles.some((r) => target.includes(r));
}