import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasAnyRole, type AppRole } from "@/lib/use-auth";
import { setUserRole } from "@/lib/admin.functions";
import { deleteUserAccount } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabel, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

const ALL_ROLES: AppRole[] = ["mahasiswa", "dosen", "staf", "admin"];

export const Route = createFileRoute("/_authenticated/admin/pengguna")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { roles, user, loading } = useAuth();
  const qc = useQueryClient();
  const update = useServerFn(setUserRole);
  const delAccount = useServerFn(deleteUserAccount);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-users"],
    enabled: hasAnyRole(roles, ["admin"]),
    queryFn: async () => {
      const [{ data: profiles }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, nim_nip, phone, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const rolesMap: Record<string, AppRole[]> = {};
      (roleRows ?? []).forEach((r: any) => {
        (rolesMap[r.user_id] ||= []).push(r.role as AppRole);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: rolesMap[p.id] ?? [] }));
    },
  });

  if (loading) return <div className="text-muted-foreground">Memuat...</div>;
  if (!hasAnyRole(roles, ["admin"])) return <div className="text-destructive">Akses ditolak. Khusus admin.</div>;

  async function toggleRole(userId: string, role: AppRole, has: boolean) {
    try {
      await update({ data: { user_id: userId, role, action: has ? "remove" : "add" } });
      toast.success("Role diperbarui");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function onDelete() {
    if (!confirmDel) return;
    if (confirmText.trim().toUpperCase() !== "HAPUS") {
      toast.error("Ketik HAPUS untuk konfirmasi");
      return;
    }
    setDeleting(true);
    try {
      await delAccount({ data: { user_id: confirmDel.id } });
      toast.success("Akun dihapus");
      setConfirmDel(null);
      setConfirmText("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Kelola Pengguna</h2>
        <p className="text-sm text-muted-foreground">Atur peran (role) pengguna</p>
      </div>
      <div className="grid gap-3">
        {data?.map((u: any) => (
          <Card key={u.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div>
                <div className="font-semibold">{u.full_name || "(Tanpa nama)"}</div>
                <div className="text-sm text-muted-foreground">{u.email || "—"}</div>
                <div className="text-xs text-muted-foreground">
                  NIM/NIP: {u.nim_nip || "—"} • HP: {u.phone || "—"} • Daftar: {u.created_at ? formatDate(u.created_at) : "—"}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {u.roles.length ? u.roles.map((r: AppRole) => (
                    <Badge key={r} variant="secondary">{roleLabel[r]}</Badge>
                  )) : <span className="text-xs text-muted-foreground">Belum ada role</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                  {ALL_ROLES.map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <Button
                        key={r}
                        size="sm"
                        variant={has ? "default" : "outline"}
                        onClick={() => toggleRole(u.id, r, has)}
                      >
                        {has ? "−" : "+"} {roleLabel[r]}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={u.id === user?.id}
                  onClick={() => { setConfirmDel({ id: u.id, name: u.full_name || u.email || "pengguna" }); setConfirmText(""); }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Hapus Akun
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => { if (!o) { setConfirmDel(null); setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen. Akun <strong>{confirmDel?.name}</strong> beserta seluruh reservasinya akan dihapus.
              Ketik <strong>HAPUS</strong> untuk konfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Ketik HAPUS" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={deleting || confirmText.trim().toUpperCase() !== "HAPUS"}>
              {deleting ? "Menghapus..." : "Hapus Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}