import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasAnyRole } from "@/lib/use-auth";
import { createVehicle, updateVehicle, deleteVehicle } from "@/lib/vehicles.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

type V = {
  id?: string;
  brand: string; model: string; year: number; plate_number: string;
  capacity: number; status: "available" | "maintenance" | "unavailable";
  photo_url?: string | null; notes?: string | null;
};

const empty: V = { brand: "", model: "", year: new Date().getFullYear(), plate_number: "", capacity: 4, status: "available", photo_url: null, notes: null };

export const Route = createFileRoute("/_authenticated/admin/kendaraan")({
  component: AdminVehiclesPage,
});

function AdminVehiclesPage() {
  const { roles, loading } = useAuth();
  const qc = useQueryClient();
  const create = useServerFn(createVehicle);
  const update = useServerFn(updateVehicle);
  const remove = useServerFn(deleteVehicle);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<V>(empty);

  const { data } = useQuery({
    queryKey: ["admin-vehicles"],
    enabled: hasAnyRole(roles, ["admin"]),
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").order("brand");
      return data ?? [];
    },
  });

  if (loading) return <div className="text-muted-foreground">Memuat...</div>;
  if (!hasAnyRole(roles, ["admin"])) return <div className="text-destructive">Akses ditolak. Khusus admin.</div>;

  async function uploadPhoto(file: File) {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("vehicle-photos").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    toast.success("Foto diunggah");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { ...form, year: Number(form.year), capacity: Number(form.capacity) };
      if (form.id) await update({ data: payload as any });
      else await create({ data: payload as any });
      toast.success(form.id ? "Kendaraan diperbarui" : "Kendaraan ditambahkan");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["admin-vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicles-list"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus kendaraan ini?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Kendaraan dihapus");
      qc.invalidateQueries({ queryKey: ["admin-vehicles"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kelola Kendaraan</h2>
          <p className="text-sm text-muted-foreground">Tambah, ubah, atau hapus kendaraan</p>
        </div>
        <Button onClick={() => { setForm(empty); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Kendaraan
        </Button>
      </div>

      <div className="grid gap-3">
        {data?.map((v: any) => (
          <Card key={v.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                {v.photo_url ? (
                  <img src={v.photo_url} alt={v.model} className="h-16 w-24 rounded-md object-cover" />
                ) : (
                  <div className="h-16 w-24 rounded-md bg-muted" />
                )}
                <div>
                  <div className="font-semibold">{v.brand} {v.model}</div>
                  <div className="text-sm text-muted-foreground">{v.year} • {v.plate_number} • {v.capacity} kursi</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={v.status} />
                <Button size="sm" variant="outline" onClick={() => { setForm(v); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDelete(v.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "Tambah"} Kendaraan</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Merek</Label>
                <Input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Input type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Plat Nomor</Label>
                <Input required value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Kapasitas</Label>
                <Input type="number" required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Tersedia</SelectItem>
                    <SelectItem value="maintenance">Perawatan</SelectItem>
                    <SelectItem value="unavailable">Tidak Tersedia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Foto</Label>
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              {form.photo_url && <img src={form.photo_url} alt="" className="h-24 w-auto rounded-md" />}
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}