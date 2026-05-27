
# Rencana Pembangunan CampusRide (MVP v1)

Aplikasi web peminjaman kendaraan operasional kampus, antarmuka **Bahasa Indonesia**, gaya **clean modern dengan aksen biru kampus**, dibangun di atas TanStack Start + Lovable Cloud (Supabase).

---

## 1. Lingkup MVP

Diimplementasikan sekarang:
- Autentikasi (email/password) + reset password
- Manajemen akun: mahasiswa & dosen self-signup; staf/admin dibuat oleh admin
- Katalog kendaraan dengan foto, filter, status
- Reservasi kendaraan dengan validasi bentrok jadwal
- Pembatalan reservasi
- Approval/penolakan oleh staf (wajib alasan saat tolak)
- Dashboard sesuai peran (mahasiswa/dosen, staf, admin)
- Riwayat reservasi pribadi
- Manajemen kendaraan oleh admin (CRUD)
- Manajemen pengguna & role oleh admin

Ditunda (sesuai PRD Out of Scope + penyederhanaan MVP):
- Email otomatis (Resend), notifikasi in-app real-time
- Laporan utilisasi & ekspor PDF/CSV mendalam
- Audit log lengkap (hanya logging dasar)
- GPS, pembayaran, mobile native

---

## 2. Peran & Hak Akses

| Role | Akses |
|------|-------|
| `mahasiswa` | Katalog, ajukan/batal reservasi, riwayat sendiri |
| `dosen` | Sama seperti mahasiswa |
| `staf` | Lihat semua reservasi, setujui/tolak, kelola jadwal |
| `admin` | Semua hak staf + CRUD kendaraan + kelola user/role |

Self-signup default role = `mahasiswa`. Saat signup, user memilih `mahasiswa` atau `dosen`. Admin dapat mempromosi user menjadi `staf`/`admin` di panel admin.

---

## 3. Halaman / Rute

```
/                           Landing (hero, fitur, CTA login)
/login                      Login
/signup                     Daftar (mahasiswa/dosen)
/reset-password             Set password baru (recovery)
/_authenticated/
  dashboard                 Dashboard sesuai role
  kendaraan                 Katalog + filter
  kendaraan/$id             Detail kendaraan + kalender ketersediaan
  reservasi/baru            Form ajukan reservasi
  reservasi                 Riwayat reservasi (saya)
  reservasi/$id             Detail reservasi
  /_staf/
    approval                Antrian persetujuan
    jadwal                  Kalender semua kendaraan
  /_admin/
    kendaraan-kelola        CRUD kendaraan
    pengguna                Kelola user & role
```

---

## 4. Skema Database (Lovable Cloud / Supabase)

**Enum `app_role`**: `mahasiswa`, `dosen`, `staf`, `admin`
**Enum `reservation_status`**: `pending`, `approved`, `rejected`, `cancelled`, `completed`

Tabel:
- `profiles` (id → auth.users, full_name, nim_nip, phone, created_at)
- `user_roles` (id, user_id, role) — tabel terpisah, akses via fungsi `has_role()` security definer
- `vehicles` (id, brand, model, year, plate_number, capacity, photo_url, status, notes, created_at)
- `reservations` (id, user_id, vehicle_id, start_at, end_at, pickup_location, destination, purpose, status, rejection_reason, approved_by, decided_at, created_at)

RLS:
- `profiles`: user baca/edit miliknya; staf/admin baca semua
- `vehicles`: semua authenticated baca; hanya admin tulis
- `reservations`: user lihat & buat & cancel miliknya (selama `pending`); staf/admin lihat & ubah status semua
- `user_roles`: hanya admin tulis; user baca role miliknya

Trigger: auto-buat row `profiles` + role default `mahasiswa` saat signup.

Storage bucket `vehicle-photos` (public read) untuk foto kendaraan.

---

## 5. Validasi Bentrok Jadwal

Server function `createReservation`:
1. Validasi input (zod): end > start, semua field wajib terisi
2. Query overlap: ada reservasi `pending`/`approved` di kendaraan yang sama dengan `start_at < new.end AND end_at > new.start` → tolak
3. Insert dengan status `pending`

Approval staf juga re-check bentrok sebelum set `approved` (mencegah race condition).

---

## 6. Desain Visual

- Palette: biru kampus (`oklch` primary ~#1e40af area), background putih bersih, abu netral, aksen sukses/peringatan
- Token didefinisikan di `src/styles.css` (light + dark mode)
- shadcn/ui untuk komponen (Card, Table, Dialog, Calendar, Form)
- Layout responsif: sidebar di desktop, bottom-nav/sheet di mobile
- Status badge berwarna sesuai status reservasi

---

## 7. Detail Teknis

- **Framework**: TanStack Start (sudah terpasang) + React 19 + Tailwind v4
- **Backend**: Lovable Cloud (Supabase) — diaktifkan di awal implementasi
- **Auth**: Supabase Auth email/password, broker untuk OAuth tidak digunakan (sesuai pilihan)
- **Data fetching**: `createServerFn` + `requireSupabaseAuth` middleware, TanStack Query untuk caching di komponen
- **Form**: react-hook-form + zod
- **Tanggal**: `date-fns` + shadcn Calendar (dengan `pointer-events-auto`)
- **Route guard**: `_authenticated` layout (cek session), nested `_staf`/`_admin` cek role via `has_role()` di server function yang dipanggil loader

---

## 8. Urutan Implementasi

1. Aktifkan Lovable Cloud
2. Migration: enum, tabel, RLS, trigger, fungsi `has_role`, storage bucket
3. Setup design tokens biru kampus + layout shell (header, sidebar, mobile nav) berbahasa Indonesia
4. Auth: signup, login, reset-password, logout, route guards
5. Seed: 1 admin awal (manual via SQL, info diberikan ke user), beberapa kendaraan contoh
6. Katalog kendaraan + halaman detail
7. Form reservasi + validasi bentrok + halaman daftar/detail reservasi user
8. Halaman approval staf (approve/reject dengan alasan) + kalender jadwal
9. Panel admin: CRUD kendaraan (dengan upload foto), kelola user/role
10. Dashboard sesuai role dengan ringkasan statistik
11. Landing page + polish UI

---

## 9. Catatan

- Akun admin pertama akan disiapkan via SQL seed. Setelah implementasi saya berikan kredensial agar Anda bisa login dan mengelola staf/admin lain.
- Notifikasi email & laporan lengkap dapat ditambahkan di iterasi berikutnya — beri tahu kapan siap dilanjutkan.

