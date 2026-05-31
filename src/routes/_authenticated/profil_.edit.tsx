import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profil_/edit")({
  component: EditProfilPage,
});

function EditProfilPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [nimNip, setNimNip] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setNimNip(profile.nim_nip || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) return toast.error("Nama wajib diisi.");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          nim_nip: nimNip.trim() || null,
          phone: phone.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profil diperbarui");
      navigate({ to: "/profil" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-muted-foreground">Memuat...</div>;

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">Edit Profil</h2>
      <Card>
        <CardHeader><CardTitle>Informasi Pribadi</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nim_nip">NIM / NIP</Label>
              <Input id="nim_nip" value={nimNip} onChange={(e) => setNimNip(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">No. HP</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/profil" })}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}