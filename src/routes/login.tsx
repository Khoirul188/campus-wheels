import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import campusRideLogo from "@/assets/logokampusride.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard" });
  }

  async function onForgot() {
    if (!email) return toast.error("Isi email terlebih dahulu");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Email reset password telah dikirim");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <img src={campusRideLogo} alt="CampusRide" className="h-12 w-auto object-contain" />
        </Link>
        <h1 className="text-2xl font-bold">Masuk</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gunakan akun kampus Anda</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={onForgot} className="text-primary hover:underline">Lupa password?</button>
          <Link to="/signup" className="text-primary hover:underline">Daftar akun</Link>
        </div>
      </div>
    </div>
  );
}