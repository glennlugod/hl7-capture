import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    conditions: ["node"],
  },
  build: {
    outDir: ".vite/build",
    lib: {
      entry: path.resolve(__dirname, "src/preload/index.ts"),
      formats: ["cjs"],
      fileName: () => "preload.js",
    },
    rollupOptions: {
      external: ["electron"],
    },
    emptyOutDir: false,
  },
});
