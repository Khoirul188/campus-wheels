import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const vehicleInput = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1980).max(2100),
  plate_number: z.string().trim().min(1).max(20),
  capacity: z.number().int().min(1).max(80),
  photo_url: z.string().url().optional().nullable(),
  status: z.enum(["available", "maintenance", "unavailable"]),
  notes: z.string().trim().max(500).optional().nullable(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Hanya admin yang dapat melakukan tindakan ini.");
}

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => vehicleInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error, data: row } = await context.supabase
      .from("vehicles")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    vehicleInput.extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("vehicles")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("vehicles")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Returns vehicle IDs that are currently in use: reservasi berstatus approved
 * atau in_use YANG SUDAH DIMULAI (start_at <= sekarang).
 *
 * PENTING: sengaja TIDAK mengecek end_at <= sekarang. Kalau jadwal sudah
 * lewat tapi peminjam belum klik "Kembalikan" (completeReservation belum
 * dipanggil, status masih approved/in_use), kendaraan harus TETAP terhitung
 * dipakai — bukan otomatis "tersedia" lagi cuma karena jadwal rencana sudah
 * habis. Kendaraan baru lepas dari daftar ini begitu status benar-benar
 * berubah jadi completed/cancelled/rejected.
 */
export const getActiveVehicleIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select("vehicle_id")
      .in("status", ["approved", "in_use"])
      .lte("start_at", nowIso);
    if (error) throw new Error(error.message);
    return { ids: Array.from(new Set((data ?? []).map((r: any) => r.vehicle_id))) };
  });

/**
 * Returns jadwal reservasi aktif (belum selesai) untuk satu kendaraan.
 * Sengaja tidak difilter end_at >= sekarang, supaya reservasi yang sudah
 * lewat jadwal tapi belum "completed" (terlambat dikembalikan) tetap
 * kelihatan di jadwal, bukan hilang begitu saja.
 */
export const getVehicleSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ vehicle_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("reservations")
      .select("id, start_at, end_at, status")
      .eq("vehicle_id", data.vehicle_id)
      .in("status", ["pending", "approved", "in_use"])
      .order("start_at");
    if (error) throw new Error(error.message);
    return { schedule: rows ?? [] };
  });