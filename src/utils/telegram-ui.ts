import type { Context } from "telegraf";
import type { MotobroContext } from "../types/bot.js";
import { logger } from "./logger.js";

/** Редактирование текста у callback; при ошибке (устарело сообщение) — ответ новым сообщением */
export async function safeEditMessageText(
  ctx: MotobroContext,
  text: string,
  extra?: Parameters<Context["editMessageText"]>[1],
): Promise<void> {
  try {
    await ctx.editMessageText(text, extra);
  } catch (e) {
    logger.warn({ err: e }, "editMessageText не удалось, шлём новое сообщение");
    await ctx.reply(text);
  }
}
