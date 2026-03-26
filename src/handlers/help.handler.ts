import type { MotobroContext } from "../types/bot.js";

export async function handleHelp(ctx: MotobroContext): Promise<void> {
  await ctx.reply(
    [
      "Команды:",
      "/ride — начать поездку",
      "/stop — закончить поездку",
      "/who — кто сейчас катается",
      "/where — где сейчас участники (примерные районы)",
      "/near — кто рядом",
      "/status — мой статус",
      "/privacy — какие данные хранятся",
      "/settings — личные настройки",
      "/groupsettings — настройки группы (только админы)",
    ].join("\n"),
  );
}
