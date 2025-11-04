import path from "path";
import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    target: "ES2020",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "public/index.html"),
      },
    },
  },
});
