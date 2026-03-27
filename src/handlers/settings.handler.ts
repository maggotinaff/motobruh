import { prisma } from "../db/prisma.js";
import { ensureUserSettings } from "../services/settings.service.js";
import { clearUserLocationSnapshot } from "../services/ride.service.js";
import { settingsKeyboard } from "../bot/keyboards.js";
import { safeEditMessageText } from "../utils/telegram-ui.js";
import type { MotobroContext } from "../types/bot.js";

export async function handleSettings(ctx: MotobroContext): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  const s = await ensureUserSettings(dbUser.id);
  await ctx.reply(
    [
      "Личные настройки:",
      `• Показывать точные координаты (в будущем): ${s.shareExactLocation ? "да" : "нет"}`,
      "",
      "Кнопки ниже:",
    ].join("\n"),
    settingsKeyboard(s.shareExactLocation),
  );
}

export async function handleSettingsCallback(
  ctx: MotobroContext,
  action: "exact" | "clearpoint",
): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  if (action === "exact") {
    const s = await ensureUserSettings(dbUser.id);
    await prisma.userSettings.update({
      where: { userId: dbUser.id },
      data: { shareExactLocation: !s.shareExactLocation },
    });
    const next = await ensureUserSettings(dbUser.id);
    await ctx.answerCbQuery(next.shareExactLocation ? "Точные коорд.: вкл" : "Точные коорд.: выкл").catch(
      () => {},
    );
    await safeEditMessageText(
      ctx,
      [
        "Личные настройки:",
        `• Показывать точные координаты (в будущем): ${next.shareExactLocation ? "да" : "нет"}`,
      ].join("\n"),
      settingsKeyboard(next.shareExactLocation),
    );
    return;
  }

  if (action === "clearpoint") {
    await clearUserLocationSnapshot(dbUser.id);
    await ctx.answerCbQuery("Последняя точка удалена").catch(() => {});
    await ctx.reply("Удалил сохранённую последнюю точку. Если поездка активна — отправь локацию снова.");
  }
}
