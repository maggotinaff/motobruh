import type { Telegraf } from "telegraf";
import { announceRideStarted } from "../services/notification.service.js";
import { applyLocationUpdate } from "../services/ride.service.js";
import { userDisplayName } from "../utils/display.js";
import type { MotobroContext } from "../types/bot.js";

export async function handleLocation(
  bot: Telegraf<MotobroContext>,
  ctx: MotobroContext,
): Promise<void> {
  const msg = ctx.message ?? ctx.editedMessage;
  const dbUser = ctx.state.dbUser;
  if (!msg || !("location" in msg) || !msg.location || !dbUser) return;

  const loc = msg.location;
  const livePeriodSec =
    "live_period" in loc && typeof loc.live_period === "number" ? loc.live_period : undefined;
  const isLive = livePeriodSec != null && livePeriodSec > 0;

  const result = await applyLocationUpdate({
    userId: dbUser.id,
    lat: loc.latitude,
    lng: loc.longitude,
    isLive,
    livePeriodSec,
  });

  if (result.kind === "invalid_coords") {
    await ctx.reply("Не получилось разобрать координаты в сообщении. Отправь локацию ещё раз.");
    return;
  }

  if (result.kind === "one_time") {
    await ctx.reply(
      [
        `Принял точку. Примерный район: ${result.zone}.`,
        "",
        "Для активной поездки лучше live location — так бот видит, что ты в пути, без лишних тапов по карте.",
      ].join("\n"),
    );
    return;
  }

  if (result.kind === "live_update") {
    return;
  }

  if (result.kind === "live_started") {
    await ctx.reply(`Поездка запущена. Примерный район: ${result.zone}.`);
    const g = result.session.group;
    if (g) {
      const gs = g.settings;
      await announceRideStarted(bot, {
        groupTelegramChatId: g.telegramChatId,
        riderDisplayName: userDisplayName(result.session.user),
        zone: result.zone,
        rideAnnouncementsEnabled: gs?.rideAnnouncementsEnabled ?? true,
        zoneAnnouncementsEnabled: gs?.zoneAnnouncementsEnabled ?? true,
      });
    }
    return;
  }

  if (result.kind === "live_autocreate") {
    await ctx.reply(
      [
        `Поездка активна. Примерный район: ${result.zone}.`,
        "В следующий раз можно нажать /ride и выбрать длительность — так удобнее и понятнее для группы.",
      ].join("\n"),
    );
  }
}
