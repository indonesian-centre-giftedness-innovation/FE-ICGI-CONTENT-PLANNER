import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icons/favicon-32.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "ICGI Content Planner",
        short_name: "Content Planner",
        description: "Meja redaksi ICGI — draft, storyboard, kalender, media, dan approval konten.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f2efe4",
        theme_color: "#14141a",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      // Catatan: backend API-nya beda origin (domain/port lain), jadi otomatis TIDAK ikut
      // ter-cache oleh service worker ini — SW cuma nge-cache aset statis frontend sendiri
      // (JS/CSS/gambar hasil build) supaya app tetap bisa dibuka meski koneksi lagi lemah.
      //
      // Sempat dicoba runtimeCaching + rangeRequests untuk cache video lintas-origin di
      // Safari, tapi DIBATALKAN: <video>/<img> ke domain lain tanpa atribut crossorigin
      // dimuat browser sebagai respons "opaque" (buram, tidak bisa dibaca sama sekali oleh
      // service worker) — RangeRequestsPlugin butuh baca ukuran/isi file buat motong
      // per-bagian, jadi malah gagal total kalau responsnya opaque. Perlu pembenahan CORS
      // di backend + atribut crossorigin di frontend dulu sebelum ini bisa diaktifkan lagi
      // dengan aman.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});