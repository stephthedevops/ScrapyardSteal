import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,prop}.ts"],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      server: "/server",
      src: "/src",
    },
  },
});
