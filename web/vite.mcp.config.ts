import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// MCP hosts load the view from one HTML document, so everything is inlined into it.
export default defineConfig({
   plugins: [react(), viteSingleFile()],
   build: { outDir: "dist/mcp", emptyOutDir: true, rollupOptions: { input: "mcp-app.html" } },
});
