import path from "path";
import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  base: "./",
  publicDir: "public",
  build: {
    outDir: path.resolve(__dirname, ".vite/renderer"),
  },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
  },
});
