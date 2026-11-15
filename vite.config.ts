import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Two build targets share one codebase:
 *  - `web`    → hosted site + installable PWA (absolute base, service worker). BASE_PATH lets it live under a sub-path.
 *  - `native` → bundled inside Capacitor / Tauri WebViews (relative base, no service worker).
 */
export default defineConfig(({ mode }) => {
  const native = mode === "native";
  const base = native ? "./" : (process.env["BASE_PATH"] ?? "/");

  return {
    base,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        ...(native ? { "virtual:pwa-register": path.resolve(__dirname, "src/platform/pwa-register-native.ts") } : {}),
      },
    },
    plugins: [
      react({ babel: { plugins: [["babel-plugin-react-compiler", {}]] } }),
      ...(native
        ? []
        : [
            VitePWA({
              registerType: "prompt",
              includeAssets: ["favicon.svg", "favicon.ico", "logo192.png", "logo512.png", "icons/*.png"],
              manifest: {
                id: base,
                name: "نَواة | Nawa",
                short_name: "نَواة",
                description: "مساحة إنتاجية عربية لتنظيم المهام والتذكيرات والتركيز · An Arabic-first, offline-first task manager.",
                lang: "ar",
                dir: "rtl",
                categories: ["productivity", "utilities"],
                theme_color: "#7668e8",
                background_color: "#f5f6fa",
                display: "standalone",
                display_override: ["standalone", "minimal-ui"],
                orientation: "any",
                start_url: base,
                scope: base,
                shortcuts: [
                  {
                    name: "مهمة جديدة",
                    short_name: "جديدة",
                    url: `${base}?action=new`,
                    icons: [{ src: "icons/icon-192.png", sizes: "192x192", type: "image/png" }],
                  },
                  {
                    name: "مهام اليوم",
                    short_name: "اليوم",
                    url: `${base}#/today`,
                    icons: [{ src: "icons/icon-192.png", sizes: "192x192", type: "image/png" }],
                  },
                ],
                icons: [
                  { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                  { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                  { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
                  { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
                ],
              },
              workbox: {
                globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
                navigateFallback: `${base}index.html`,
                cleanupOutdatedCaches: true,
              },
            }),
          ]),
    ],
    // Capacitor and Tauri read the output from ./build.
    build: {
      outDir: "build",
      assetsDir: "static",
      emptyOutDir: true,
      target: "es2022",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
            if (id.includes("@dnd-kit")) return "dnd";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("zod")) return "zod";
            return undefined;
          },
        },
      },
    },
    server: { host: "0.0.0.0", port: 1420, strictPort: true },
    preview: { host: "0.0.0.0", port: 4173, strictPort: true },
  };
});
