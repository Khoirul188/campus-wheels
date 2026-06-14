import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import logoUGMCR from "@/assets/logoUGMCR.png";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [nimNip, setNimNip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"mahasiswa" | "dosen">("mahasiswa");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    const uid = data.user?.id;
    if (uid) {
      // Update profile (trigger already created a row)
      await supabase
        .from("profiles")
        .update({ full_name: fullName, nim_nip: nimNip || null, phone: phone || null })
        .eq("id", uid);
      // If user picked dosen, swap default role
      if (role === "dosen") {
        await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "mahasiswa");
        await supabase.from("user_roles").insert({ user_id: uid, role: "dosen" });
      }
    }
    setLoading(false);
    toast.success("Akun berhasil dibuat");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </div>
          <span className="font-bold">CampusRide</span>
        </Link>
        <h1 className="text-2xl font-bold">Daftar Akun</h1>
        <p className="mt-1 text-sm text-muted-foreground">Untuk mahasiswa & dosen</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                  <SelectItem value="dosen">Dosen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nimNip">NIM / NIP</Label>
              <Input id="nimNip" value={nimNip} onChange={(e) => setNimNip(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">No. HP</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : "Daftar"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-primary hover:underline">Masuk</Link>
        </div>
      </div>
    </div>
  );
}