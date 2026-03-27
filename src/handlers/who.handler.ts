import { env } from "../config/env.js";
import { upsertGroupFromChat } from "../services/group.service.js";
import { listActiveRidesForGroup } from "../services/ride.service.js";
import { minutesSince } from "../utils/duration.js";
import { userDisplayName } from "../utils/display.js";
import { isValidCoordinates } from "../utils/geo.js";
import { buildMapPageUrl } from "../utils/mapViewToken.js";
import { Markup } from "telegraf";
import type { MotobroContext } from "../types/bot.js";

export async function handleWho(ctx: MotobroContext): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  const chat = ctx.chat;
  let groupId: string | null = null;
  if (chat?.type === "group" || chat?.type === "supergroup") {
    const g = await upsertGroupFromChat(chat);
    groupId = g?.id ?? null;
  }

  const rides = await listActiveRidesForGroup(groupId);

  const hasSelfCoords =
    dbUser.lastKnownLatitude != null &&
    dbUser.lastKnownLongitude != null &&
    isValidCoordinates(dbUser.lastKnownLatitude, dbUser.lastKnownLongitude);

  if (rides.length === 0 && !hasSelfCoords) {
    await ctx.reply(
      "Сейчас никто не катается. Чтобы увидеть себя на карте, отправь локацию или начни поездку через /ride.",
    );
    return;
  }

  const mapUrl = buildMapPageUrl(
    env.WEBHOOK_URL,
    { groupId, viewerUserId: dbUser.id },
    env.TELEGRAM_WEBHOOK_SECRET,
  );

  const body: string[] =
    rides.length > 0
      ? [
          "Сейчас катаются:",
          ...rides.map((r) => {
            const name = userDisplayName(r.user);
            const zone = r.lastZone ?? "неизвестно";
            const mins = r.lastLocationAt ? minutesSince(r.lastLocationAt) : 0;
            return `• ${name} — ${zone} — ${mins} мин`;
          }),
        ]
      : ["Сейчас никто не в активной поездке.", "На карте — твоя последняя точка (как у других, 🏍 и имя)."];

  await ctx.reply(
    [...body, "", "🗺 Карта в браузере. Ссылка ~15 мин:", mapUrl].join("\n"),
    Markup.inlineKeyboard([[Markup.button.url("🗺 Открыть карту", mapUrl)]]),
  );
}
