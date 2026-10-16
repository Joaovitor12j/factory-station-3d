import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // three.js alone is close to the default 500 kB limit; the demo is one page.
  build: { chunkSizeWarningLimit: 1400 },
});
