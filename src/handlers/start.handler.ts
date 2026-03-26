import type { MotobroContext } from "../types/bot.js";

export async function handleStart(ctx: MotobroContext): Promise<void> {
  await ctx.reply(
    [
      "Привет. Я бот для мото-группы.",
      "Помогаю видеть, кто сейчас катается и кто рядом, без тяжёлого трекинга и лишнего расхода батареи.",
      "Работаю через обычный live location в Telegram — без своего фонового GPS.",
      "",
      "Используй /help, чтобы посмотреть команды.",
    ].join("\n"),
  );
}
