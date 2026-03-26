import { upsertGroupFromChat } from "../services/group.service.js";
import { listActiveRidesForGroup } from "../services/ride.service.js";
import { minutesSince } from "../utils/duration.js";
import { userDisplayName } from "../utils/display.js";
import type { MotobroContext } from "../types/bot.js";

export async function handleWho(ctx: MotobroContext): Promise<void> {
  const chat = ctx.chat;
  let groupId: string | null = null;
  if (chat?.type === "group" || chat?.type === "supergroup") {
    const g = await upsertGroupFromChat(chat);
    groupId = g?.id ?? null;
  }

  const rides = await listActiveRidesForGroup(groupId);
  if (rides.length === 0) {
    await ctx.reply("Сейчас никто не катается.");
    return;
  }

  const lines = rides.map((r) => {
    const name = userDisplayName(r.user);
    const zone = r.lastZone ?? "неизвестно";
    const mins = r.lastLocationAt ? minutesSince(r.lastLocationAt) : 0;
    return `• ${name} — ${zone} — ${mins} мин`;
  });

  await ctx.reply(["Сейчас катаются:", ...lines].join("\n"));
}
