import type { MotobroContext } from "../types/bot.js";

export async function handleStart(ctx: MotobroContext): Promise<void> {
  await ctx.reply(
    [
      "Привет. Я бот для мото-группы: кто катается и где примерно, через live location в Telegram.",
      "Команды смотри в меню слева от поля ввода.",
    ].join("\n"),
  );
}
