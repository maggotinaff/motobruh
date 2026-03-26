import { stopRideForUser } from "../services/ride.service.js";
import type { MotobroContext } from "../types/bot.js";

export async function handleStop(ctx: MotobroContext): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  const result = await stopRideForUser(dbUser.id);
  if (!result.stopped) {
    await ctx.reply("У тебя нет активной поездки или ожидания локации — нечего останавливать.");
    return;
  }
  await ctx.reply("Поездка завершена.");
}
