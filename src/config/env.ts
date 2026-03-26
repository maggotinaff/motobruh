import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test", "staging"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN обязателен"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
  WEBHOOK_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : process.env.RENDER_EXTERNAL_URL),
    z
      .string()
      .url("Задай WEBHOOK_URL или используй RENDER_EXTERNAL_URL на Render")
      .refine(
        (url) =>
          url.startsWith("https://") ||
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "test",
        "WEBHOOK_URL для Telegram должен начинаться с https://",
      ),
  ),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16, "TELEGRAM_WEBHOOK_SECRET: минимум 16 символов"),
  DISABLE_REVERSE_GEOCODING: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  NOMINATIM_BASE_URL: z.string().url().default("https://nominatim.openstreetmap.org"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

export type Env = z.infer<typeof envSchema> & {
  DISABLE_REVERSE_GEOCODING: boolean;
};

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Ошибка переменных окружения: ${JSON.stringify(msg)}`);
  }
  const data = parsed.data;
  return {
    ...data,
    DISABLE_REVERSE_GEOCODING: data.DISABLE_REVERSE_GEOCODING ?? false,
  };
}

export const env = parseEnv();
