import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const service = "http://127.0.0.1:8765";

export default defineConfig({
   plugins: [react()],
   server: { proxy: { "/api": service, "/events": service } },
   build: { outDir: "dist", emptyOutDir: true },
});
