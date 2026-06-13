import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Car, CalendarCheck, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusRide — Peminjaman Kendaraan Operasional Kampus" },
      { name: "description", content: "Sistem reservasi kendaraan operasional kampus yang cepat, transparan, dan mudah digunakan." },
      { property: "og:title", content: "CampusRide" },
      { property: "og:description", content: "Reservasi kendaraan operasional kampus secara online." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-foreground">CampusRide</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/login">Masuk</Link></Button>
            <Button asChild><Link to="/signup">Daftar</Link></Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              Sarana &amp; Prasarana Kampus
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Peminjaman kendaraan kampus, jadi mudah.
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              CampusRide membantu mahasiswa, dosen, dan staf mengajukan, menyetujui,
              dan memantau peminjaman kendaraan operasional kampus dalam satu portal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/signup">Mulai Sekarang</Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/login">Sudah punya akun</Link></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Car, title: "Katalog Kendaraan", desc: "Lihat ketersediaan armada" },
              { icon: CalendarCheck, title: "Jadwal Bentrok-Free", desc: "Validasi otomatis" },
              { icon: ShieldCheck, title: "Persetujuan Staf", desc: "Alur jelas & transparan" },
              { icon: Users, title: "Untuk Civitas", desc: "Mahasiswa, dosen, staf" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CampusRide • Unit Sarana &amp; Prasarana Kampus
        </div>
      </footer>
    </div>
  );
}
