import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Car, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/kendaraan/")({
  component: VehiclesPage,
});

function VehiclesPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").order("brand");
      return data ?? [];
    },
  });
  const { data: activeNow } = useQuery({
    queryKey: ["vehicles-active-now"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("reservations")
        .select("vehicle_id, status")
        .in("status", ["approved", "in_use"])
        .lte("start_at", nowIso)
        .gt("end_at", nowIso);
      return new Set((data ?? []).map((r: any) => r.vehicle_id));
    },
  });
  const effectiveStatus = (v: any): string => {
    if (v.status !== "available") return v.status;
    if (activeNow?.has(v.id)) return "unavailable";
    return "available";
  };
  const filtered = (data ?? []).filter((v: any) => {
    const s = q.toLowerCase();
    return (
      v.brand.toLowerCase().includes(s) ||
      v.model.toLowerCase().includes(s) ||
      v.plate_number.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Katalog Kendaraan</h2>
          <p className="text-sm text-muted-foreground">Pilih kendaraan untuk reservasi</p>
        </div>
        <Input
          placeholder="Cari merek, model, plat..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:w-72"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v: any) => (
          <Card key={v.id} className="overflow-hidden">
            <div className="flex aspect-video items-center justify-center bg-muted">
              {v.photo_url ? (
                <img src={v.photo_url} alt={v.model} className="h-full w-full object-cover" />
              ) : (
                <Car className="h-16 w-16 text-muted-foreground/40" />
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{v.brand} {v.model}</div>
                  <div className="text-xs text-muted-foreground">{v.year} • {v.plate_number}</div>
                </div>
                <StatusBadge status={effectiveStatus(v)} />
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> {v.capacity} kursi
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to="/kendaraan/$id" params={{ id: v.id }}>Detail</Link>
                </Button>
                <Button asChild size="sm" className="flex-1" disabled={v.status !== "available"}>
                  <Link to="/reservasi/baru" search={{ vehicle: v.id }}>Pinjam</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!filtered.length && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Tidak ada kendaraan ditemukan.
          </div>
        )}
      </div>
    </div>
  );
}