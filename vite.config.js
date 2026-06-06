import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 🔥 expose sur réseau local
    port: 5173,
    hmr: {
      clientPort: 5173, // 🔥 stabilise websocket
    },
  },
});