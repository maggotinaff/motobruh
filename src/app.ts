import express from "express";
import { env } from "./config/env.js";
import { createBot } from "./bot/bot.js";
import { healthRouter } from "./api/health.route.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "512kb" }));
  app.use(healthRouter);

  const bot = createBot();
  app.use(
    "/telegram/webhook",
    bot.webhookCallback("/telegram/webhook", {
      secretToken: env.TELEGRAM_WEBHOOK_SECRET,
    }),
  );

  return { app, bot };
}
