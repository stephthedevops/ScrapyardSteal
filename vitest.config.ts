import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,prop}.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      server: "/server",
      src: "/src",
    },
  },
});
