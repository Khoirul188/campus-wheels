## Perubahan

1. **Perkecil sidebar & perbesar logo**
   - `src/components/ui/sidebar.tsx`: ubah `SIDEBAR_WIDTH` dari `16rem` → `13rem`.
   - `src/components/app-sidebar.tsx`: perbesar `logo-ugm.png` (h-8 w-8 → h-10 w-10) dan `campus-ride.png` (h-6 → h-8), sesuaikan padding header agar pas dengan sidebar yang lebih ramping.

2. **Tab Persetujuan bisa digeser di layar kecil**
   - `src/routes/_authenticated/approval.tsx`: pastikan kontainer tab benar-benar scrollable horizontal di mobile — tambahkan `w-full` pada wrapper overflow dan `touch-pan-x` agar gestur geser jari aktif di perangkat sentuh.

3. **Hapus judul "CampusRide" di header**
   - `src/routes/_authenticated.tsx`: hapus elemen `<h1>CampusRide</h1>` di header; sisakan `SidebarTrigger` di kiri dan `AccountMenu` di kanan.

## Catatan teknis
- Logo UGM + tulisan Campus Ride tetap di sidebar; saat collapsed hanya logo yang tampil (perilaku sudah ada).
- Tidak ada perubahan logika/data.
