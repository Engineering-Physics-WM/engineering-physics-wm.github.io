import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const readBuildId = () => {
  const raw = process.env.GITHUB_SHA || (() => {
    try {
      return execSync("git rev-parse --short=12 HEAD", { encoding: "utf8" }).trim();
    } catch {
      return "local";
    }
  })();
  return raw.slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, "") || "local";
};

const buildId = readBuildId();

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        entryFileNames: `assets/[name]-${buildId}-[hash].js`,
        chunkFileNames: `assets/[name]-${buildId}-[hash].js`,
        assetFileNames: `assets/[name]-${buildId}-[hash][extname]`,
      },
    },
  },
});
