import { getActiveRideForUser, getPendingRideForUser } from "../services/ride.service.js";
import { minutesSince } from "../utils/duration.js";
import type { MotobroContext } from "../types/bot.js";

export async function handleStatus(ctx: MotobroContext): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  const active = await getActiveRideForUser(dbUser.id);
  const pending = active ? null : await getPendingRideForUser(dbUser.id);

  if (pending) {
    await ctx.reply(
      "Жду live location после выбора длительности. Как отправишь — поездка станет активной.",
    );
    return;
  }

  if (!active) {
    await ctx.reply("У тебя нет активной поездки.");
    return;
  }

  const zone = active.lastZone ?? "неизвестно";
  const sinceStart = minutesSince(active.startedAt);
  const sinceLoc = active.lastLocationAt ? minutesSince(active.lastLocationAt) : null;

  await ctx.reply(
    [
      "Активная поездка.",
      `Старт: ${sinceStart} мин назад.`,
      `Последний район: ${zone}.`,
      sinceLoc != null ? `С последнего обновления локации: ${sinceLoc} мин.` : "Локации ещё не было.",
    ].join("\n"),
  );
}
