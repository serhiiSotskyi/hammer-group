import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Read-only access to the live Hammer Group backend for the prototype.
// Override with HG_API=http://localhost:4000 to use a local backend.
declare const process: { env: Record<string, string | undefined> };
const API = process.env.HG_API ?? "https://hg-backend-d3habycebefnf8ex.polandcentral-01.azurewebsites.net";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: API, changeOrigin: true, secure: true },
      "/uploads": { target: API, changeOrigin: true, secure: true },
    },
  },
  preview: {
    proxy: {
      "/api": { target: API, changeOrigin: true, secure: true },
      "/uploads": { target: API, changeOrigin: true, secure: true },
    },
  },
});
