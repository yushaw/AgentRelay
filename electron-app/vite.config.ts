import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "src/renderer"),
  base: "./",
  publicDir: path.resolve(__dirname, "src/renderer/public"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer/src"),
    },
  },
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
  },
});
