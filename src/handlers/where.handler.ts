import { env } from "../config/env.js";
import { upsertGroupFromChat } from "../services/group.service.js";
import { listActiveRidesForGroup } from "../services/ride.service.js";
import { userDisplayName } from "../utils/display.js";
import { signMapViewPayload } from "../utils/mapViewToken.js";
import type { MotobroContext } from "../types/bot.js";

export async function handleWhere(ctx: MotobroContext): Promise<void> {
  const chat = ctx.chat;
  let groupId: string | null = null;
  if (chat?.type === "group" || chat?.type === "supergroup") {
    const g = await upsertGroupFromChat(chat);
    groupId = g?.id ?? null;
  }

  const rides = await listActiveRidesForGroup(groupId);
  if (rides.length === 0) {
    await ctx.reply("Сейчас нет активных поездок — негде искать на карте районы.");
    return;
  }

  const lines = rides.map((r) => {
    const name = userDisplayName(r.user);
    const zone = r.lastZone ?? "неизвестно";
    return `• ${name} — ${zone}`;
  });

  const mapToken = signMapViewPayload({ mode: "where", groupId }, env.TELEGRAM_WEBHOOK_SECRET);
  const base = env.WEBHOOK_URL.replace(/\/$/, "");
  const mapUrl = `${base}/map/rides?t=${encodeURIComponent(mapToken)}`;

  await ctx.reply(
    ["Примерные районы:", ...lines, "", `🗺 На карте (откроется в браузере, ~15 мин):`, mapUrl].join("\n"),
  );
}
