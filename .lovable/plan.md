
# Update CampusRide v1.1 — Status Otomatis & Pengembalian Kendaraan

Menambahkan dua kemampuan utama dari PRD v1.1:
1. **Status kendaraan otomatis** mengikuti reservasi aktif (tidak lagi manual).
2. **Proses pengembalian kendaraan** dengan upload foto bukti di garasi.

---

## 1. Perubahan Database

### Tabel `reservations` — kolom baru
- `actual_pickup_time timestamptz` — waktu kendaraan mulai dipakai
- `actual_return_time timestamptz` — waktu pengembalian aktual
- `return_proof_url text` — URL foto bukti pengembalian
- `return_photo_uploaded_at timestamptz`
- `return_photo_uploaded_by uuid`
- `returned_by uuid` — staf yang memverifikasi

### Enum `reservation_status` — tambah nilai baru
- Tambah `in_use` (Sedang Dipinjam). Status existing tetap: `pending`, `approved`, `rejected`, `cancelled`, `completed`.

### Storage bucket baru: `return-proofs` (public read)
- Policy: authenticated insert; user hanya bisa upload di folder `{reservation_id}/`; staf/admin dapat membaca semua.
- Validasi MIME (jpg/jpeg/png) & ukuran ≤5MB dilakukan di server function sebelum panggilan upload.

### Status kendaraan: tetap manual untuk maintenance/unavailable admin-set
- Kolom `vehicles.status` tetap, tetapi UI ketersediaan kendaraan **dihitung dinamis** dari reservasi aktif (`approved` atau `in_use` yang mencakup `now()`), bukan dari kolom statis. Ini menghindari race condition & menyesuaikan FR-14.
- Admin tetap bisa set `maintenance`/`unavailable` manual; status efektif = manual jika non-`available`, selain itu dihitung dari reservasi.
- Pada katalog & form reservasi, gunakan helper `getEffectiveVehicleStatus(vehicle, now)` di server function.

---

## 2. Server Functions Baru (`src/lib/reservations.functions.ts`)

### `startReservation({ id })`
- Hanya staf/admin atau pemilik reservasi.
- Syarat: status `approved`.
- Set `status='in_use'`, `actual_pickup_time=now()`.

### `completeReservation({ id, photo_path })`
- Pemilik reservasi atau staf/admin.
- Syarat: status `approved` atau `in_use`.
- Wajib `photo_path` (sudah di-upload ke `return-proofs/{reservation_id}/...`).
- Validasi file metadata (ada di storage, content-type valid, size ≤5MB) via `supabaseAdmin.storage`.
- Set `status='completed'`, `actual_return_time=now()`, `return_proof_url`, `return_photo_uploaded_at=now()`, `return_photo_uploaded_by=userId`, `returned_by=userId` (jika staf).

### Update `createReservation` & `decideReservation`
- Overlap check sertakan status baru `in_use`.

### Helper `getEffectiveVehicleStatus`
- Dipakai oleh katalog dan halaman detail untuk menampilkan badge real-time.

---

## 3. Perubahan UI

### `kendaraan.index.tsx` & `kendaraan.$id.tsx`
- Tampilkan status efektif (Tersedia / Tidak Tersedia / Maintenance) berdasar reservasi aktif.

### `reservasi.index.tsx` (Riwayat user)
- Tombol baru pada baris status `approved` → **"Mulai Pinjam"** (opsional, jika pengguna sendiri ambil kendaraan).
- Tombol pada `approved`/`in_use` → **"Kembalikan Kendaraan"** membuka dialog upload foto.
- Dialog upload: file picker (jpg/jpeg/png, ≤5MB), preview, upload ke bucket `return-proofs/{reservation_id}/{uuid}.{ext}` lalu panggil `completeReservation`.

### `approval.tsx` (Staf)
- Tambah tab/section "Sedang Dipinjam" dan "Menunggu Pengembalian".
- Staf dapat menekan **"Verifikasi Pengembalian"** untuk reservasi `in_use` (upload foto + complete) atau cukup melihat foto yang diunggah user lalu konfirmasi.
- Tampilkan thumbnail `return_proof_url` + metadata (siapa upload, kapan).

### Dashboard
- Staf: kartu "Kendaraan Sedang Dipinjam" (count `in_use`) dan "Menunggu Pengembalian".
- Detail menampilkan pengguna, kendaraan, waktu mulai, estimasi selesai.

### `StatusBadge`
- Tambah varian `in_use` (Sedang Dipinjam) — warna biru/info.

### `src/lib/format.ts`
- Tambah label `in_use: "Sedang Dipinjam"`.

---

## 4. Validasi & Aturan
- File: hanya jpg/jpeg/png, max 5MB, min 1 foto. Penolakan jelas di toast Indonesia.
- Tidak bisa `complete` tanpa `return_proof_url`.
- Tidak bisa start/complete pada status yang tidak sesuai (server-side guard).
- Overlap reservasi memperhitungkan `in_use`.

---

## 5. Out of Scope (tetap ditunda)
- Email notifikasi otomatis (FR-18) — tetap untuk iterasi berikutnya.
- Laporan utilisasi & ekspor (FR-25/26) — belum.
- Pemindaian malware file upload (NFR-07) — gunakan validasi MIME/size dasar dulu.

---

## 6. Urutan Eksekusi
1. Migration: kolom baru `reservations`, tambah enum `in_use`, buat bucket `return-proofs` + policies.
2. Update server functions (`reservations.functions.ts`): `startReservation`, `completeReservation`, sesuaikan overlap, helper effective status.
3. Update `format.ts` + `StatusBadge` varian baru.
4. Update katalog & detail kendaraan untuk status efektif.
5. Update `reservasi.index.tsx`: dialog upload foto + tombol kembalikan.
6. Update `approval.tsx`: section in_use & verifikasi pengembalian.
7. Update dashboard staf.
8. Verifikasi alur end-to-end: pending → approved → in_use → completed.
