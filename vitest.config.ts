import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["extensions/**/*.test.ts", "app/**/*.test.ts"],
    globals: false,
    environment: "node",
  },
});
