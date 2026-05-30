import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasAnyRole } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { Car, CalendarPlus, ClipboardCheck, ListChecks } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles, profile } = useAuth();
  const isStaff = hasAnyRole(roles, ["staf", "admin"]);
  const claim = useServerFn(claimFirstAdmin);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id, isStaff],
    enabled: !!user,
    queryFn: async () => {
      const [myRes, vehAvail, pendingAll, inUseAll] = await Promise.all([
        supabase.from("reservations").select("id, status", { count: "exact", head: false }).eq("user_id", user!.id),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "available"),
        isStaff
          ? supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending")
          : Promise.resolve({ count: 0 } as any),
        isStaff
          ? supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "in_use")
          : Promise.resolve({ count: 0 } as any),
      ]);
      return {
        myTotal: myRes.data?.length ?? 0,
        myPending: myRes.data?.filter((r) => r.status === "pending").length ?? 0,
        myApproved: myRes.data?.filter((r) => r.status === "approved").length ?? 0,
        vehiclesAvailable: vehAvail.count ?? 0,
        pendingApprovals: (pendingAll as any).count ?? 0,
        inUseCount: (inUseAll as any).count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["dashboard-recent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, status, start_at, end_at, destination, vehicles(brand, model, plate_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  async function onClaimAdmin() {
    try {
      await claim();
      toast.success("Anda sekarang admin. Muat ulang halaman.");
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Halo, {profile?.full_name || user?.email}</h2>
      </div>

      {roles.length === 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm">
            Belum ada role. Hubungi admin untuk diaktifkan, atau klaim admin pertama jika ini instalasi baru.
            <Button size="sm" variant="outline" className="ml-3" onClick={onClaimAdmin}>
              Klaim Admin Pertama
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Reservasi Saya" value={stats?.myTotal ?? 0} />
        <StatCard icon={CalendarPlus} label="Menunggu Persetujuan" value={stats?.myPending ?? 0} />
        <StatCard icon={ClipboardCheck} label="Disetujui" value={stats?.myApproved ?? 0} />
        <StatCard icon={Car} label="Kendaraan Tersedia" value={stats?.vehiclesAvailable ?? 0} />
      </div>

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Operasional Kendaraan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <div className="text-2xl font-bold">{stats?.pendingApprovals ?? 0}</div>
                <div className="text-xs text-muted-foreground">Menunggu persetujuan</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-2xl font-bold">{stats?.inUseCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">Sedang dipinjam</div>
              </div>
            </div>
            <Button asChild className="mt-3"><Link to="/approval">Buka Persetujuan</Link></Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reservasi Terbaru</CardTitle>
          <Button asChild size="sm" variant="outline"><Link to="/reservasi">Lihat semua</Link></Button>
        </CardHeader>
        <CardContent>
          {!recent?.length ? (
            <p className="text-sm text-muted-foreground">Belum ada reservasi.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">
                      {r.vehicles?.brand} {r.vehicles?.model}{" "}
                      <span className="text-muted-foreground">• {r.vehicles?.plate_number}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(r.start_at)} → {formatDateTime(r.end_at)} • {r.destination}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}