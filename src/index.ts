import { createServer } from "http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { registerBotCommands } from "./bot/bot.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./utils/logger.js";
import { startExpireRidesJob } from "./jobs/expire-rides.job.js";

const { app, bot } = createApp();
const server = createServer(app);

startExpireRidesJob();

async function bootstrap(): Promise<void> {
  const baseUrl = env.WEBHOOK_URL.replace(/\/$/, "");
  const webhookPath = "/telegram/webhook";
  const webhookUrl = `${baseUrl}${webhookPath}`;

  await bot.telegram.setWebhook(webhookUrl, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "edited_message", "callback_query", "my_chat_member"],
  });
  await registerBotCommands(bot);

  logger.info(
    {
      port: env.PORT,
      nodeEnv: env.NODE_ENV,
      webhookUrl,
      reverseGeocoding: !env.DISABLE_REVERSE_GEOCODING,
    },
    "Сервис запускается (без секретов в логах)",
  );
}

server.listen(env.PORT, () => {
  void bootstrap().catch((e) => {
    logger.fatal({ err: e }, "Не удалось настроить webhook");
    process.exit(1);
  });
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Завершение работы");
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
