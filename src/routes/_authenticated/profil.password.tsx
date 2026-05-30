import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profil/password")({
  component: PasswordPage,
});

function PasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password minimal 6 karakter.");
    if (pw !== pw2) return toast.error("Konfirmasi password tidak cocok.");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password berhasil diubah");
      setPw("");
      setPw2("");
      navigate({ to: "/profil" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-2xl font-bold">Ubah Password</h2>
      <Card>
        <CardHeader><CardTitle>Password Baru</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Password Baru</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Konfirmasi Password</Label>
              <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
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