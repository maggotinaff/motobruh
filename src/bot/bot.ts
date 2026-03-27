import { Telegraf } from "telegraf";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { attachUserMiddleware } from "./middleware.js";
import { BOT_COMMANDS } from "./commands.js";
import { handleStart } from "../handlers/start.handler.js";
import { handleHelp } from "../handlers/help.handler.js";
import { handleRide } from "../handlers/ride.handler.js";
import { handleStop } from "../handlers/stop.handler.js";
import { handleWho } from "../handlers/who.handler.js";
import { handleStatus } from "../handlers/status.handler.js";
import { handlePrivacy } from "../handlers/privacy.handler.js";
import { handleSettings } from "../handlers/settings.handler.js";
import { handleGroupSettings } from "../handlers/groupsettings.handler.js";
import { handleLocation } from "../handlers/location.handler.js";
import { handleCallbackQuery } from "../handlers/callback.handler.js";
import { upsertGroupFromChat } from "../services/group.service.js";
import type { MotobroContext } from "../types/bot.js";

export function createBot(): Telegraf<MotobroContext> {
  const bot = new Telegraf<MotobroContext>(env.BOT_TOKEN);

  bot.use(attachUserMiddleware);

  bot.use(async (ctx, next) => {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : undefined;
    const isCommand = Boolean(text?.startsWith("/"));
    const isCb = Boolean(ctx.callbackQuery);
    if ((isCommand || isCb) && !ctx.state.dbUser) {
      if (isCb) {
        await ctx.answerCbQuery("Нет данных пользователя").catch(() => {});
      }
      await ctx.reply("Не вижу твой профиль в этом сообщении. Открой бота в личке и нажми /start.");
      return;
    }
    return next();
  });

  bot.start(handleStart);
  bot.help(handleHelp);
  bot.command("ride", handleRide);
  bot.command("stop", handleStop);
  bot.command("who", handleWho);
  bot.command("status", handleStatus);
  bot.command("privacy", handlePrivacy);
  bot.command("settings", handleSettings);
  bot.command("groupsettings", handleGroupSettings);

  bot.on("callback_query", handleCallbackQuery);

  bot.on("my_chat_member", async (ctx) => {
    try {
      const chat = ctx.chat;
      if (chat && (chat.type === "group" || chat.type === "supergroup")) {
        await upsertGroupFromChat(chat);
      }
      const newStatus = ctx.myChatMember?.new_chat_member?.status;
      if (newStatus === "left" || newStatus === "kicked") {
        logger.info({ chatId: ctx.chat?.id }, "Бот удалён из чата или потерял доступ");
      }
    } catch (e) {
      logger.warn({ err: e }, "my_chat_member: ошибка обработки");
    }
  });

  bot.on(["message", "edited_message"], async (ctx, next) => {
    const msg = ctx.message ?? ctx.editedMessage;
    if (!msg || !("location" in msg) || !msg.location) {
      return next();
    }
    await handleLocation(bot, ctx as MotobroContext);
  });

  bot.catch((err, ctx) => {
    logger.error({ err, updateType: ctx.updateType }, "Ошибка в обработчике бота");
  });

  return bot;
}

export async function registerBotCommands(bot: Telegraf<MotobroContext>): Promise<void> {
  await bot.telegram.setMyCommands(
    BOT_COMMANDS.map((c) => ({ command: c.command, description: c.description })),
  );
}
