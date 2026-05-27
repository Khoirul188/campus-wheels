import { format } from "date-fns";
import { id } from "date-fns/locale";

export function formatDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return format(d, "EEEE, d MMM yyyy • HH:mm", { locale: id });
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return format(d, "d MMM yyyy", { locale: id });
}

export function formatTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return format(d, "HH:mm", { locale: id });
}

export const statusLabel: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  completed: "Selesai",
  available: "Tersedia",
  maintenance: "Perawatan",
  unavailable: "Tidak Tersedia",
};

export const roleLabel: Record<string, string> = {
  mahasiswa: "Mahasiswa",
  dosen: "Dosen",
  staf: "Staf",
  admin: "Administrator",
};