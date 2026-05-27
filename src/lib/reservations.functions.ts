import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const reservationInput = z.object({
  vehicle_id: z.string().uuid(),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  pickup_location: z.string().trim().min(1).max(200),
  destination: z.string().trim().min(1).max(200),
  purpose: z.string().trim().min(3).max(1000),
});

export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reservationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (new Date(data.end_at) <= new Date(data.start_at)) {
      throw new Error("Waktu selesai harus setelah waktu mulai.");
    }
    // Overlap check
    const { data: overlap, error: ovErr } = await supabase
      .from("reservations")
      .select("id")
      .eq("vehicle_id", data.vehicle_id)
      .in("status", ["pending", "approved"])
      .lt("start_at", data.end_at)
      .gt("end_at", data.start_at)
      .limit(1);
    if (ovErr) throw new Error(ovErr.message);
    if (overlap && overlap.length > 0) {
      throw new Error("Kendaraan sudah dipesan pada rentang waktu tersebut.");
    }
    const { data: inserted, error } = await supabase
      .from("reservations")
      .insert({
        user_id: userId,
        vehicle_id: data.vehicle_id,
        start_at: data.start_at,
        end_at: data.end_at,
        pickup_location: data.pickup_location,
        destination: data.destination,
        purpose: data.purpose,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const cancelReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: res, error: fErr } = await supabase
      .from("reservations")
      .select("user_id, status")
      .eq("id", data.id)
      .single();
    if (fErr) throw new Error(fErr.message);
    if (res.user_id !== userId) throw new Error("Tidak diizinkan.");
    if (res.status !== "pending" && res.status !== "approved") {
      throw new Error("Reservasi tidak bisa dibatalkan pada status ini.");
    }
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        rejection_reason: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify staff/admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isStaff = (roles ?? []).some((r) => r.role === "staf" || r.role === "admin");
    if (!isStaff) throw new Error("Tidak diizinkan.");

    if (data.decision === "rejected" && !data.rejection_reason?.trim()) {
      throw new Error("Alasan penolakan wajib diisi.");
    }

    const { data: cur, error: gErr } = await supabase
      .from("reservations")
      .select("vehicle_id, start_at, end_at, status")
      .eq("id", data.id)
      .single();
    if (gErr) throw new Error(gErr.message);
    if (cur.status !== "pending") {
      throw new Error("Reservasi sudah diproses sebelumnya.");
    }

    if (data.decision === "approved") {
      // Re-check overlap with other approved reservations
      const { data: overlap } = await supabase
        .from("reservations")
        .select("id")
        .eq("vehicle_id", cur.vehicle_id)
        .eq("status", "approved")
        .lt("start_at", cur.end_at)
        .gt("end_at", cur.start_at)
        .neq("id", data.id)
        .limit(1);
      if (overlap && overlap.length > 0) {
        throw new Error("Sudah ada reservasi disetujui yang bentrok.");
      }
    }

    const { error } = await supabase
      .from("reservations")
      .update({
        status: data.decision,
        rejection_reason: data.decision === "rejected" ? data.rejection_reason : null,
        approved_by: userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });