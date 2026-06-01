import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  decideReservation,
  startReservation,
  completeReservation,
} from "@/lib/reservations.functions";
import { useAuth, hasAnyRole } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/approval")({
  component: ApprovalPage,
});

function ApprovalPage() {
  const { roles, loading } = useAuth();
  const qc = useQueryClient();
  const decide = useServerFn(decideReservation);
  const start = useServerFn(startReservation);
  const complete = useServerFn(completeReservation);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState("pending");
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["approval-list", tab],
    enabled: hasAnyRole(roles, ["staf", "admin"]),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, vehicles(brand, model, plate_number)")
        .eq("status", tab as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id))).filter(Boolean);
      if (userIds.length === 0) return rows;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, nim_nip, phone, email")
        .in("id", userIds);
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return rows.map((r: any) => ({ ...r, requester: map.get(r.user_id) ?? null }));
    },
  });

  if (loading) return <div className="text-muted-foreground">Memuat...</div>;
  if (!hasAnyRole(roles, ["staf", "admin"]))
    return <div className="text-destructive">Akses ditolak. Khusus staf/admin.</div>;

  async function onApprove(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await decide({ data: { id, decision: "approved" } });
      toast.success("Reservasi disetujui");
      qc.invalidateQueries({ queryKey: ["approval-list"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }
  async function onReject() {
    if (!rejectId) return;
    if (busyId) return;
    setBusyId(rejectId);
    try {
      await decide({ data: { id: rejectId, decision: "rejected", rejection_reason: reason } });
      toast.success("Reservasi ditolak");
      setRejectId(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["approval-list"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function onStart(id: string) {
    if (!confirm("Tandai kendaraan sedang dipinjam?")) return;
    try {
      await start({ data: { id } });
      toast.success("Status: Sedang Dipinjam");
      qc.invalidateQueries({ queryKey: ["approval-list"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function openReturn(id: string) {
    setReturnFor(id);
    setFile(null);
  }

  async function onSubmitReturn() {
    if (!returnFor || !file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) return toast.error("Format harus JPG/JPEG/PNG.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran melebihi 5 MB.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${returnFor}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("return-proofs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      await complete({ data: { id: returnFor, photo_path: path } });
      toast.success("Pengembalian terverifikasi");
      setReturnFor(null);
      setFile(null);
      qc.invalidateQueries({ queryKey: ["approval-list"] });
    } catch (e: any) {
      toast.error(e.message || "Gagal");
    } finally {
      setUploading(false);
    }
  }

  async function viewProof(path: string) {
    const { data, error } = await supabase.storage
      .from("return-proofs")
      .createSignedUrl(path, 60 * 10);
    if (error) return toast.error(error.message);
    setProofPreview(data.signedUrl);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Persetujuan Reservasi</h2>
        <p className="text-sm text-muted-foreground">Kelola pengajuan peminjaman</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto w-max flex-nowrap gap-1">
            <TabsTrigger value="pending" className="whitespace-nowrap">Menunggu</TabsTrigger>
            <TabsTrigger value="approved" className="whitespace-nowrap">Disetujui</TabsTrigger>
            <TabsTrigger value="in_use" className="whitespace-nowrap">Sedang Dipinjam</TabsTrigger>
            <TabsTrigger value="completed" className="whitespace-nowrap">Selesai</TabsTrigger>
            <TabsTrigger value="rejected" className="whitespace-nowrap">Ditolak</TabsTrigger>
            <TabsTrigger value="cancelled" className="whitespace-nowrap">Dibatalkan</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value={tab} className="mt-4 space-y-3">
          {!data?.length ? (
            <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Tidak ada data.</CardContent></Card>
          ) : (
            data.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {r.vehicles?.brand} {r.vehicles?.model} • {r.vehicles?.plate_number}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(r.start_at)} → {formatDateTime(r.end_at)}
                    </div>
                    <div className="text-sm"><strong>Tujuan:</strong> {r.destination}</div>
                    <div className="text-sm text-muted-foreground"><strong>Keperluan:</strong> {r.purpose}</div>
                    {r.requester && (
                      <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
                        <div className="font-semibold text-foreground">Pemohon</div>
                        <div>{r.requester.full_name || "—"}</div>
                        <div className="text-muted-foreground">
                          {r.requester.email || "—"} • {r.requester.nim_nip || "—"} • {r.requester.phone || "—"}
                        </div>
                      </div>
                    )}
                    {r.rejection_reason && (
                      <div className="text-sm text-destructive"><strong>Alasan:</strong> {r.rejection_reason}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={r.status} />
                    <div className="flex flex-wrap justify-end gap-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => { setRejectId(r.id); setReason(""); }}>
                            Tolak
                          </Button>
                          <Button size="sm" disabled={busyId === r.id} onClick={() => onApprove(r.id)}>
                            {busyId === r.id ? "Memproses..." : "Setujui"}
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Button size="sm" variant="secondary" onClick={() => onStart(r.id)}>Mulai Pinjam</Button>
                      )}
                      {(r.status === "approved" || r.status === "in_use") && (
                        <Button size="sm" onClick={() => openReturn(r.id)}>Verifikasi Pengembalian</Button>
                      )}
                      {r.status === "completed" && r.return_proof_url && (
                        <Button size="sm" variant="outline" onClick={() => viewProof(r.return_proof_url)}>
                          Lihat Bukti
                        </Button>
                      )}
                    </div>
                    {r.status === "completed" && r.actual_return_time && (
                      <div className="text-xs text-muted-foreground">
                        Kembali: {formatDateTime(r.actual_return_time)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alasan Penolakan</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Tuliskan alasan..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Batal</Button>
            <Button onClick={onReject} disabled={!reason.trim() || !!busyId}>
              {busyId ? "Memproses..." : "Tolak Reservasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnFor} onOpenChange={(o) => !o && setReturnFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Pengembalian</DialogTitle>
            <DialogDescription>
              Unggah foto kendaraan di garasi. Format JPG/PNG, maksimum 5 MB.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="file" accept="image/jpeg,image/png,image/jpg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <img src={URL.createObjectURL(file)} alt="Pratinjau" className="max-h-64 w-full rounded-md object-contain bg-muted" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnFor(null)} disabled={uploading}>Batal</Button>
            <Button onClick={onSubmitReturn} disabled={!file || uploading}>
              {uploading ? "Mengunggah..." : "Selesaikan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofPreview} onOpenChange={(o) => !o && setProofPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bukti Pengembalian</DialogTitle></DialogHeader>
          {proofPreview && (
            <img src={proofPreview} alt="Bukti" className="max-h-[70vh] w-full rounded-md object-contain bg-muted" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}