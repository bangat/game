import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 43210
  },
  preview: {
    host: "0.0.0.0",
    port: 43211
  }
});
