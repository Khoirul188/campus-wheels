import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import {
  cancelReservation,
  startReservation,
  completeReservation,
} from "@/lib/reservations.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reservasi/")({
  component: ReservationsPage,
});

function ReservationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const cancel = useServerFn(cancelReservation);
  const start = useServerFn(startReservation);
  const complete = useServerFn(completeReservation);
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [uploading, setUploading] = useState(false);

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

  async function onStart(id: string) {
    if (!confirm("Mulai peminjaman kendaraan sekarang?")) return;
    try {
      await start({ data: { id } });
      toast.success("Status diubah menjadi Sedang Dipinjam");
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function openReturn(id: string) {
    setReturnFor(id);
    setFile(null);
    setReturnNotes("");
  }

  async function onSubmitReturn() {
    if (!returnFor || !file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast.error("Format foto harus JPG/JPEG/PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto melebihi 5 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${returnFor}/${crypto.randomUUID()}.${ext}`;
    let uploaded = false;
    try {
      const { error: upErr } = await supabase.storage
        .from("return-proofs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      uploaded = true;
      await complete({ data: { id: returnFor, photo_path: path, return_notes: returnNotes } });
      toast.success("Pengembalian berhasil dicatat");
      setReturnFor(null);
      setFile(null);
      setReturnNotes("");
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    } catch (e: any) {
      // Kalau foto sudah keupload tapi update status gagal, hapus lagi fotonya
      // supaya tidak nyangkut jadi file sampah di storage.
      if (uploaded) {
        await supabase.storage.from("return-proofs").remove([path]).catch(() => {});
      }
      toast.error(e.message || "Gagal mengunggah foto");
    } finally {
      setUploading(false);
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
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {(r.status === "approved" || r.status === "in_use") &&
                      new Date(r.end_at) < new Date() && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                          Terlambat
                        </span>
                      )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {(r.status === "pending" || r.status === "approved") && (
                      <Button size="sm" variant="outline" onClick={() => onCancel(r.id)}>Batalkan</Button>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" variant="secondary" onClick={() => onStart(r.id)}>Mulai Pinjam</Button>
                    )}
                    {(r.status === "approved" || r.status === "in_use") && (
                      <Button size="sm" onClick={() => openReturn(r.id)}>Kembalikan</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!returnFor} onOpenChange={(o) => !o && setReturnFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pengembalian Kendaraan</DialogTitle>
            <DialogDescription>
              Unggah foto kendaraan saat sudah berada di garasi kampus. Format JPG/PNG, maksimum 5 MB.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <img
                src={URL.createObjectURL(file)}
                alt="Pratinjau"
                className="max-h-64 w-full rounded-md object-contain bg-muted"
              />
            )}
            <Textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              rows={3}
              placeholder="Catatan kondisi kendaraan (opsional), misal: bensin diisi penuh, ada lecet kecil di bumper belakang"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnFor(null)} disabled={uploading}>Batal</Button>
            <Button onClick={onSubmitReturn} disabled={!file || uploading}>
              {uploading ? "Mengunggah..." : "Selesaikan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}