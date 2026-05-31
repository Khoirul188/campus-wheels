import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/use-auth";
import { roleLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilPage,
});

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/60 last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="col-span-2 text-sm">{value || "—"}</div>
    </div>
  );
}

function ProfilPage() {
  const { user, profile, roles, loading } = useAuth();
  if (loading) return <div className="text-muted-foreground">Memuat...</div>;
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Profil Saya</h2>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/profil/password">Ubah Password</Link></Button>
          <Button asChild size="sm"><Link to="/profil/edit">Edit Profil</Link></Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Informasi Akun</CardTitle></CardHeader>
        <CardContent>
          <Row label="Nama Lengkap" value={profile?.full_name} />
          <Row label="Email" value={user?.email} />
          <Row label="NIM / NIP" value={profile?.nim_nip} />
          <Row label="No. HP" value={profile?.phone} />
          <div className="grid grid-cols-3 gap-2 py-2">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="col-span-2 flex flex-wrap gap-1">
              {roles.length ? roles.map((r) => (
                <Badge key={r} variant="secondary">{roleLabel[r]}</Badge>
              )) : <span className="text-sm text-muted-foreground">—</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}