import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  preview: {
    host: "0.0.0.0",
    port: 5173
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "dist/**",
        "vite.config.ts",
        "tests/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/modules/**/contracts.ts",
        "src/**/*.d.ts"
      ]
    }
  }
});
