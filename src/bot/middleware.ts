import type { Middleware } from "telegraf";
import { upsertTelegramUser } from "../services/user.service.js";
import type { MotobroContext } from "../types/bot.js";

export const attachUserMiddleware: Middleware<MotobroContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from) {
    return next();
  }
  const dbUser = await upsertTelegramUser(from);
  ctx.state.dbUser = dbUser;
  return next();
};
