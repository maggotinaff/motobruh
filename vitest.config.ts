import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      BOT_TOKEN: "test-token-for-vitest",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      WEBHOOK_URL: "https://example.com",
      TELEGRAM_WEBHOOK_SECRET: "0123456789abcdef",
      DISABLE_REVERSE_GEOCODING: "false",
      NOMINATIM_BASE_URL: "https://nominatim.openstreetmap.org",
      LOG_LEVEL: "error",
    },
  },
});
