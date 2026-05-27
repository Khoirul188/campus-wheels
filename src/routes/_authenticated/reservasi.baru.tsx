import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { createReservation } from "@/lib/reservations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const searchSchema = z.object({ vehicle: z.string().optional() });

export const Route = createFileRoute("/_authenticated/reservasi/baru")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NewReservationPage,
});

function NewReservationPage() {
  const navigate = useNavigate();
  const { vehicle: preselected } = Route.useSearch();
  const create = useServerFn(createReservation);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-available"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, plate_number, status")
        .eq("status", "available")
        .order("brand");
      return data ?? [];
    },
  });

  const [vehicleId, setVehicleId] = useState(preselected ?? "");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) return toast.error("Pilih kendaraan");
    setLoading(true);
    try {
      await create({
        data: {
          vehicle_id: vehicleId,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          pickup_location: pickup,
          destination,
          purpose,
        },
      });
      toast.success("Reservasi diajukan, menunggu persetujuan");
      navigate({ to: "/reservasi" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Ajukan Reservasi</h2>
        <p className="text-sm text-muted-foreground">Isi detail peminjaman kendaraan</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Detail Peminjaman</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kendaraan</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Pilih kendaraan" /></SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.brand} {v.model} • {v.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">Mulai</Label>
                <Input id="start" type="datetime-local" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Selesai</Label>
                <Input id="end" type="datetime-local" required value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup">Lokasi Penjemputan</Label>
              <Input id="pickup" required value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest">Tujuan</Label>
              <Input id="dest" required value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Keperluan</Label>
              <Textarea id="purpose" required rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Ajukan Reservasi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}