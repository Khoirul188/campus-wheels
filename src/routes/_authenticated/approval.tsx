import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decideReservation } from "@/lib/reservations.functions";
import { useAuth, hasAnyRole } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState("pending");

  const { data } = useQuery({
    queryKey: ["approval-list", tab],
    enabled: hasAnyRole(roles, ["staf", "admin"]),
    queryFn: async () => {
      let q = supabase
        .from("reservations")
        .select("*, vehicles(brand, model, plate_number), profiles!reservations_user_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      // profiles relation may not be set up via FK — fallback simple
      const { data, error } = await supabase
        .from("reservations")
        .select("*, vehicles(brand, model, plate_number)")
        .eq("status", tab as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) return <div className="text-muted-foreground">Memuat...</div>;
  if (!hasAnyRole(roles, ["staf", "admin"]))
    return <div className="text-destructive">Akses ditolak. Khusus staf/admin.</div>;

  async function onApprove(id: string) {
    try {
      await decide({ data: { id, decision: "approved" } });
      toast.success("Reservasi disetujui");
      qc.invalidateQueries({ queryKey: ["approval-list"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onReject() {
    if (!rejectId) return;
    try {
      await decide({ data: { id: rejectId, decision: "rejected", rejection_reason: reason } });
      toast.success("Reservasi ditolak");
      setRejectId(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["approval-list"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Persetujuan Reservasi</h2>
        <p className="text-sm text-muted-foreground">Kelola pengajuan peminjaman</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="approved">Disetujui</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          <TabsTrigger value="cancelled">Dibatalkan</TabsTrigger>
        </TabsList>
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
                    {r.rejection_reason && (
                      <div className="text-sm text-destructive"><strong>Alasan:</strong> {r.rejection_reason}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setRejectId(r.id); setReason(""); }}>
                          Tolak
                        </Button>
                        <Button size="sm" onClick={() => onApprove(r.id)}>Setujui</Button>
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
            <Button onClick={onReject} disabled={!reason.trim()}>Tolak Reservasi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}