import { defineConfig } from "vite";
import { version } from "./package.json";

export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    port: 3000,
  },
});
