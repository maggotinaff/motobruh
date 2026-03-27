import { handleRideDurationCallback } from "./ride.handler.js";
import { handleSettingsCallback } from "./settings.handler.js";
import { handleGroupSettingsCallback } from "./groupsettings.handler.js";
import { logger } from "../utils/logger.js";
import type { MotobroContext } from "../types/bot.js";

export async function handleCallbackQuery(ctx: MotobroContext): Promise<void> {
  const cq = ctx.callbackQuery;
  const data = cq && "data" in cq ? cq.data : undefined;
  if (!data || !ctx.state.dbUser) return;

  try {
    if (data.startsWith("ride:")) {
      const m = Number(data.split(":")[1]);
      if (![15, 30, 60, 120].includes(m)) {
        await ctx.answerCbQuery("Неверный выбор").catch(() => {});
        return;
      }
      await handleRideDurationCallback(ctx, m);
      return;
    }

    if (data.startsWith("set:")) {
      const p = data.split(":");
      if (p[1] === "exact" && p[2] === "toggle") {
        await handleSettingsCallback(ctx, "exact");
      } else if (p[1] === "clearpoint") {
        await handleSettingsCallback(ctx, "clearpoint");
      } else {
        await ctx.answerCbQuery().catch(() => {});
      }
      return;
    }

    if (data.startsWith("gs:")) {
      await handleGroupSettingsCallback(ctx, data);
    }
  } catch (e) {
    logger.error({ err: e }, "callback_query");
    await ctx.answerCbQuery("Ошибка, попробуй ещё раз").catch(() => {});
  }
}
