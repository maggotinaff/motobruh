import type { MotobroContext } from "../types/bot.js";

export async function handleHelp(ctx: MotobroContext): Promise<void> {
  await ctx.reply(
    [
      "Команды:",
      "/ride — начать поездку",
      "/stop — закончить поездку",
      "/who — кто катается (районы + карта)",
      "/where — районы на карте и в тексте",
      "/near — кто рядом и карта с кругом радиуса",
      "/status — мой статус",
      "/privacy — какие данные хранятся",
      "/settings — личные настройки",
      "/groupsettings — настройки группы (только админы)",
    ].join("\n"),
  );
}
