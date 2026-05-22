import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "tests/**/*.{test,spec}.{ts,tsx,js,jsx}",
      "js/**/*.{test,spec}.{ts,tsx,js,jsx}",
    ],
  },
});
