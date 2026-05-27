import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { cancelReservation } from "@/lib/reservations.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reservasi/")({
  component: ReservationsPage,
});

function ReservationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const cancel = useServerFn(cancelReservation);

  const { data } = useQuery({
    queryKey: ["my-reservations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select("*, vehicles(brand, model, plate_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function onCancel(id: string) {
    if (!confirm("Batalkan reservasi ini?")) return;
    try {
      await cancel({ data: { id } });
      toast.success("Reservasi dibatalkan");
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reservasi Saya</h2>
          <p className="text-sm text-muted-foreground">Riwayat & status peminjaman</p>
        </div>
        <Button asChild><Link to="/reservasi/baru">Ajukan Baru</Link></Button>
      </div>

      {!data?.length ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Belum ada reservasi.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="space-y-1">
                  <div className="font-semibold">
                    {r.vehicles?.brand} {r.vehicles?.model} • {r.vehicles?.plate_number}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(r.start_at)} → {formatDateTime(r.end_at)}
                  </div>
                  <div className="text-sm">
                    <strong>Tujuan:</strong> {r.destination} • <strong>Penjemputan:</strong> {r.pickup_location}
                  </div>
                  <div className="text-sm text-muted-foreground"><strong>Keperluan:</strong> {r.purpose}</div>
                  {r.rejection_reason && (
                    <div className="text-sm text-destructive"><strong>Alasan ditolak:</strong> {r.rejection_reason}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={r.status} />
                  {(r.status === "pending" || r.status === "approved") && (
                    <Button size="sm" variant="outline" onClick={() => onCancel(r.id)}>Batalkan</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}