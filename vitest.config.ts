import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,prop}.ts"],
    environment: "node",
    globals: true,
  },
  resolve: {
    // Vite resolves "/" as the project root, not the filesystem root.
    // These aliases let tests import from "server/..." and "src/..." directly.
    alias: {
      server: "/server",
      src: "/src",
    },
  },
});
