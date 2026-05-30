## Ringkasan Perubahan

### 1. Menu Akun di Header (semua pengguna)
- Tambahkan dropdown avatar di kanan header `src/routes/_authenticated.tsx` (di samping `<SidebarTrigger />`).
- Isi dropdown: nama + email, **Profil Saya**, **Edit Profil**, **Ubah Password**, **Keluar**.
- Pindahkan tombol "Keluar" dari sidebar footer ke dropdown ini (sidebar footer tetap menampilkan nama saja, tanpa daftar peran).

### 2. Halaman Profil
Buat route baru:
- `src/routes/_authenticated/profil.tsx` — tampilan profil (nama, email, NIM/NIP, no. HP, peran sebagai badge — bukan teks "Peran: ...").
- `src/routes/_authenticated/profil.edit.tsx` — form edit `full_name`, `nim_nip`, `phone` (update tabel `profiles`).
- `src/routes/_authenticated/profil.password.tsx` — form ubah password (password baru + konfirmasi) memakai `supabase.auth.updateUser({ password })`. Tidak perlu password lama (Supabase tidak mewajibkan).

### 3. Data Pemohon Terlihat oleh Staf/Admin
Masalah: query `reservations` di `approval.tsx` tidak ikut menarik data profil pemohon (RLS profil sudah mengizinkan staf/admin lihat semua).
- Ubah query di `src/routes/_authenticated/approval.tsx` menjadi:
  ```ts
  .select("*, vehicles(brand, model, plate_number), profiles:user_id(full_name, nim_nip, phone)")
  ```
  Jika join via FK tidak tersedia, fallback: query `profiles` terpisah berdasarkan kumpulan `user_id`, lalu gabungkan di klien.
- Tampilkan blok "Pemohon" di setiap kartu reservasi: nama, NIM/NIP, no. HP, email.
- Untuk email, tambahkan kolom `email` ke tabel `profiles` lewat migrasi + perbarui trigger `handle_new_user` agar mengisi `email = NEW.email`. (Backfill data lama dengan UPDATE dari `auth.users`.)

### 4. Kelola Pengguna Lengkap + Hapus Akun (Admin)
Di `src/routes/_authenticated/admin.pengguna.tsx`:
- Tampilkan kolom tambahan: email, tanggal daftar (`created_at`), no. HP, NIM/NIP (sudah ada sebagian).
- Tambah tombol **Hapus Akun** per baris dengan dialog konfirmasi (ketik nama/"HAPUS" untuk konfirmasi).
- Tambah server function baru di `src/lib/admin.functions.ts`: `deleteUser({ user_id })` — pakai `supabaseAdmin.auth.admin.deleteUser(user_id)` setelah `assertAdmin`. Cegah admin menghapus dirinya sendiri.
- Setelah hapus, baris di `profiles`, `user_roles`, dan `reservations` ikut terhapus jika ada FK `on delete cascade`; jika tidak, lakukan cleanup eksplisit di handler.

### 5. Hilangkan Tulisan "Peran: ..."
- `src/routes/_authenticated/dashboard.tsx` — hapus paragraf "Peran: ...".
- `src/components/app-sidebar.tsx` — hapus baris `{roles.join(", ")}` di footer.
- Pastikan tidak ada teks "Peran:" tersisa di route lain (grep).

## Catatan Teknis

- Migrasi baru:
  1. `ALTER TABLE public.profiles ADD COLUMN email text;`
  2. Update `handle_new_user()` untuk mengisi `email`.
  3. Backfill: `UPDATE profiles SET email = u.email FROM auth.users u WHERE profiles.id = u.id;`
- Tidak perlu RLS baru — staf/admin sudah punya akses SELECT ke `profiles`.
- `deleteUser` wajib server-side (service role); jangan panggil dari klien.

## Pertanyaan
Tidak ada — lanjut implementasi setelah persetujuan rencana.