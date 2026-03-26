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
      `• Радиус «рядом»: ${s.nearRadiusKm} км`,
      `• Показывать точные координаты (в будущем): ${s.shareExactLocation ? "да" : "нет"}`,
      "",
      "Кнопки ниже:",
    ].join("\n"),
    settingsKeyboard(s.nearRadiusKm, s.shareExactLocation),
  );
}

export async function handleSettingsCallback(
  ctx: MotobroContext,
  action: "near" | "exact" | "clearpoint",
  value?: string,
): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  if (action === "near" && value) {
    const km = Number(value);
    if (![3, 5, 10].includes(km)) {
      await ctx.answerCbQuery("Неверное значение").catch(() => {});
      return;
    }
    await prisma.userSettings.update({
      where: { userId: dbUser.id },
      data: { nearRadiusKm: km },
    });
    await ctx.answerCbQuery(`Радиус: ${km} км`).catch(() => {});
    const s = await ensureUserSettings(dbUser.id);
    await safeEditMessageText(
      ctx,
      [
        "Личные настройки:",
        `• Радиус «рядом»: ${s.nearRadiusKm} км`,
        `• Показывать точные координаты (в будущем): ${s.shareExactLocation ? "да" : "нет"}`,
      ].join("\n"),
      settingsKeyboard(s.nearRadiusKm, s.shareExactLocation),
    );
    return;
  }

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
        `• Радиус «рядом»: ${next.nearRadiusKm} км`,
        `• Показывать точные координаты (в будущем): ${next.shareExactLocation ? "да" : "нет"}`,
      ].join("\n"),
      settingsKeyboard(next.nearRadiusKm, next.shareExactLocation),
    );
    return;
  }

  if (action === "clearpoint") {
    await clearUserLocationSnapshot(dbUser.id);
    await ctx.answerCbQuery("Последняя точка удалена").catch(() => {});
    await ctx.reply("Удалил сохранённую последнюю точку (для /near). Если поездка активна — отправь локацию снова.");
  }
}
