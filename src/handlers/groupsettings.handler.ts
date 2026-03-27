import { prisma } from "../db/prisma.js";
import { upsertGroupFromChat } from "../services/group.service.js";
import { ensureGroupSettings } from "../services/settings.service.js";
import { groupSettingsKeyboard } from "../bot/keyboards.js";
import { isChatAdmin } from "../utils/permissions.js";
import { safeEditMessageText } from "../utils/telegram-ui.js";
import type { MotobroContext } from "../types/bot.js";

async function requireGroupAdmin(ctx: MotobroContext): Promise<boolean> {
  const chat = ctx.chat;
  const from = ctx.from;
  if (!chat || !from) return false;
  if (chat.type !== "group" && chat.type !== "supergroup") return false;
  const member = await ctx.telegram.getChatMember(chat.id, from.id);
  return isChatAdmin(member.status);
}

export async function handleGroupSettings(ctx: MotobroContext): Promise<void> {
  const chat = ctx.chat;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
    await ctx.reply("Команда /groupsettings работает только в группе.");
    return;
  }
  if (!(await requireGroupAdmin(ctx))) {
    await ctx.reply("Только администраторы группы могут менять эти настройки.");
    return;
  }
  const g = await upsertGroupFromChat(chat);
  if (!g) return;
  const gs = await ensureGroupSettings(g.id);
  await ctx.reply(
    [
      "Настройки группы:",
      `• Таймаут неактивности: ${gs.inactivityTimeoutMin} мин`,
      `• Объявления о поездках: ${gs.rideAnnouncementsEnabled ? "вкл" : "выкл"}`,
      `• Объявления о районе (тексты с зоной): ${gs.zoneAnnouncementsEnabled ? "вкл" : "выкл"}`,
    ].join("\n"),
    groupSettingsKeyboard(),
  );
}

export async function handleGroupSettingsCallback(ctx: MotobroContext, data: string): Promise<void> {
  const chat = ctx.chat;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
    await ctx.answerCbQuery("Только в группе").catch(() => {});
    return;
  }
  if (!(await requireGroupAdmin(ctx))) {
    await ctx.answerCbQuery("Нужны права админа").catch(() => {});
    return;
  }

  const g = await upsertGroupFromChat(chat);
  if (!g) {
    await ctx.answerCbQuery("Группа не найдена").catch(() => {});
    return;
  }

  const gs = await ensureGroupSettings(g.id);
  const parts = data.split(":");
  const kind = parts[1];
  const raw = parts[2];

  if (kind === "timeout" && raw) {
    const min = Number(raw);
    if (![10, 15, 30].includes(min)) {
      await ctx.answerCbQuery("Неверное значение").catch(() => {});
      return;
    }
    await prisma.groupSettings.update({
      where: { groupId: g.id },
      data: { inactivityTimeoutMin: min },
    });
    await ctx.answerCbQuery(`Таймаут: ${min} мин`).catch(() => {});
  } else if (kind === "toggle" && raw === "ride") {
    await prisma.groupSettings.update({
      where: { groupId: g.id },
      data: { rideAnnouncementsEnabled: !gs.rideAnnouncementsEnabled },
    });
    await ctx.answerCbQuery("Переключено: объявления о поездках").catch(() => {});
  } else if (kind === "toggle" && raw === "zone") {
    await prisma.groupSettings.update({
      where: { groupId: g.id },
      data: { zoneAnnouncementsEnabled: !gs.zoneAnnouncementsEnabled },
    });
    await ctx.answerCbQuery("Переключено: объявления о районе").catch(() => {});
  } else {
    await ctx.answerCbQuery().catch(() => {});
    return;
  }

  const next = await ensureGroupSettings(g.id);
  await safeEditMessageText(
    ctx,
    [
      "Настройки группы:",
      `• Таймаут неактивности: ${next.inactivityTimeoutMin} мин`,
      `• Объявления о поездках: ${next.rideAnnouncementsEnabled ? "вкл" : "выкл"}`,
      `• Объявления о районе (тексты с зоной): ${next.zoneAnnouncementsEnabled ? "вкл" : "выкл"}`,
    ].join("\n"),
    groupSettingsKeyboard(),
  );
}
