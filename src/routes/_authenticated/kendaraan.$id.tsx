import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { Car, Users, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/kendaraan/$id")({
  component: VehicleDetailPage,
});

function VehicleDetailPage() {
  const { id } = Route.useParams();
  const { data: vehicle } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("id", id).single();
      return data;
    },
  });
  const { data: upcoming } = useQuery({
    queryKey: ["vehicle-schedule", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, start_at, end_at, status")
        .eq("vehicle_id", id)
        .in("status", ["pending", "approved", "in_use"])
        .gte("end_at", new Date().toISOString())
        .order("start_at");
      return data ?? [];
    },
  });

  if (!vehicle) return <div className="text-muted-foreground">Memuat...</div>;

  const nowIso = new Date().toISOString();
  const inUseNow = (upcoming ?? []).some(
    (r: any) =>
      (r.status === "approved" || r.status === "in_use") &&
      r.start_at <= nowIso &&
      r.end_at > nowIso,
  );
  const effective =
    vehicle.status !== "available" ? vehicle.status : inUseNow ? "unavailable" : "available";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex aspect-video items-center justify-center bg-muted">
            {vehicle.photo_url ? (
              <img src={vehicle.photo_url} alt={vehicle.model} className="h-full w-full object-cover" />
            ) : (
              <Car className="h-24 w-24 text-muted-foreground/40" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{vehicle.brand} {vehicle.model}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={effective} />
            </div>
            <Row label="Tahun" value={String(vehicle.year)} />
            <Row label="Plat Nomor" value={vehicle.plate_number} />
            <Row label="Kapasitas" value={`${vehicle.capacity} kursi`} />
            {vehicle.notes && <Row label="Catatan" value={vehicle.notes} />}
            <Button asChild className="w-full mt-2" disabled={vehicle.status !== "available"}>
              <Link to="/reservasi/baru" search={{ vehicle: vehicle.id }}>Ajukan Peminjaman</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Jadwal Mendatang</CardTitle>
        </CardHeader>
        <CardContent>
          {!upcoming?.length ? (
            <p className="text-sm text-muted-foreground">Tidak ada jadwal yang akan datang.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <div>{formatDateTime(r.start_at)} → {formatDateTime(r.end_at)}</div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}