import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Web deployments live at the domain root; bundled WebViews need relative paths.
  base: mode === "native" ? "./" : "/",
  build: {
    outDir: "build",
    assetsDir: "static",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: "0.0.0.0",
    port: 1420,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 10000,
  },
}));
