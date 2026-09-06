import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Konfigurasi Vite standar untuk deploy ke Vercel (lewat Nitro), menggantikan
// paket @lovable.dev/vite-tanstack-config yang sebelumnya sudah "membungkus"
// plugin khusus Cloudflare secara diam-diam. Kalau nanti mau deploy ulang ke
// Cloudflare Pages, lihat file vite.config.ts.cloudflare.bak sebagai referensi.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Tetap arahkan ke src/server.ts (wrapper error handling kita).
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
  ],
});
