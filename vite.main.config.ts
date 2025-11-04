import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    conditions: ["node"],
  },
  build: {
    outDir: ".vite/build",
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/main/index.ts"),
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: ["electron", "cap"],
    },
    emptyOutDir: false,
  },
});
