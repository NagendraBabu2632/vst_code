import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/exec-api": {
        target: "http://172.16.0.177:8018",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/exec-api/, ""),
      },
    },
  },
});
