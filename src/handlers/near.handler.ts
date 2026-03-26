import { env } from "../config/env.js";
import { upsertGroupFromChat } from "../services/group.service.js";
import { ensureGroupSettings, ensureUserSettings } from "../services/settings.service.js";
import {
  findNearbyActiveRiders,
  getActiveRideForUser,
} from "../services/ride.service.js";
import { formatKm } from "../utils/distance.js";
import { userDisplayName } from "../utils/display.js";
import { isValidCoordinates } from "../utils/geo.js";
import { buildMapPageUrl } from "../utils/mapViewToken.js";
import { Markup } from "telegraf";
import type { MotobroContext } from "../types/bot.js";

function clampRadiusKm(km: number, fallback: number): number {
  if (!Number.isFinite(km) || km <= 0) return fallback;
  return Math.min(100, Math.max(0.5, km));
}

export async function handleNear(ctx: MotobroContext): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  const chat = ctx.chat;
  let groupId: string | null = null;
  if (chat?.type === "group" || chat?.type === "supergroup") {
    const g = await upsertGroupFromChat(chat);
    groupId = g?.id ?? null;
  }

  const active = await getActiveRideForUser(dbUser.id);
  const lat =
    dbUser.lastKnownLatitude ??
    active?.lastLatitude ??
    null;
  const lng =
    dbUser.lastKnownLongitude ??
    active?.lastLongitude ??
    null;

  if (lat == null || lng == null) {
    await ctx.reply(
      "Чтобы искать рядом, нужна твоя точка. Отправь текущую локацию или начни поездку через /ride и поделись live location.",
    );
    return;
  }

  if (!isValidCoordinates(lat, lng)) {
    await ctx.reply("Координаты сейчас некорректные. Отправь локацию заново или обнови поездку.");
    return;
  }

  if (active?.groupId && groupId && active.groupId !== groupId) {
    await ctx.reply(
      "У тебя активная поездка в другой группе — для /near лучше использовать ту же группу или завершить поездку.",
    );
    return;
  }

  const userSettings = await ensureUserSettings(dbUser.id);
  const groupSettings = groupId ? await ensureGroupSettings(groupId) : null;
  const rawRadius =
    userSettings.nearRadiusKm > 0
      ? userSettings.nearRadiusKm
      : groupSettings?.defaultNearRadiusKm ?? 5;
  const radiusKm = clampRadiusKm(rawRadius, 5);

  const nearby = await findNearbyActiveRiders({
    requesterUserId: dbUser.id,
    lat,
    lng,
    radiusKm,
    groupId,
  });

  const nearMapPayload = {
    mode: "near" as const,
    groupId,
    requesterUserId: dbUser.id,
    lat,
    lng,
    radiusKm,
  };
  const mapUrl = buildMapPageUrl(env.WEBHOOK_URL, nearMapPayload, env.TELEGRAM_WEBHOOK_SECRET);

  if (nearby.length === 0) {
    await ctx.reply(
      [
        "Сейчас рядом с тобой никого нет (в выбранном радиусе).",
        "На карте — ты и круг поиска:",
        mapUrl,
      ].join("\n"),
      Markup.inlineKeyboard([[Markup.button.url("🗺 Карта (ты и радиус)", mapUrl)]]),
    );
    return;
  }

  const lines = nearby.map((n) => `• ${userDisplayName(n.ride.user)} — ${formatKm(n.km)}`);

  await ctx.reply(
    [
      "Рядом с тобой:",
      ...lines,
      "",
      "🗺 Карта: ты, круг радиуса и метки. Ссылка ~15 мин:",
      mapUrl,
    ].join("\n"),
    Markup.inlineKeyboard([[Markup.button.url("🗺 Открыть карту", mapUrl)]]),
  );
}
