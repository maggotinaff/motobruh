import { upsertGroupFromChat } from "../services/group.service.js";
import {
  createPendingRide,
  getActiveRideForUser,
  getPendingRideForUser,
} from "../services/ride.service.js";
import { rideDurationKeyboard } from "../bot/keyboards.js";
import type { MotobroContext } from "../types/bot.js";

/** Короткая подпись к инлайн-кнопкам выбора минут (Telegram требует непустой текст). */
const RIDE_DURATION_PROMPT = "Выбери длительность:";

export async function handleRide(ctx: MotobroContext): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  const chat = ctx.chat;
  const group =
    chat && (chat.type === "group" || chat.type === "supergroup")
      ? await upsertGroupFromChat(chat)
      : null;
  const groupId = group?.id ?? null;

  const active = await getActiveRideForUser(dbUser.id);
  if (active) {
    if (active.groupId && groupId && active.groupId !== groupId) {
      await ctx.reply(
        "У тебя уже есть активная поездка в другой группе. Заверши её командой /stop (можно в личке с ботом), затем начни новую.",
      );
      return;
    }
    await ctx.reply(
      "У тебя уже есть активная поездка. Новую не создаю — продолжай делиться live location, а чтобы закончить, жми /stop.",
    );
    return;
  }

  const pending = await getPendingRideForUser(dbUser.id);
  if (pending) {
    await ctx.reply(
      "Ты уже выбрал длительность. Отправь live location через Telegram — так бот поймёт, что ты в пути.",
    );
    return;
  }

  await ctx.reply(RIDE_DURATION_PROMPT, rideDurationKeyboard());
}

export async function handleRideDurationCallback(
  ctx: MotobroContext,
  minutes: number,
): Promise<void> {
  const dbUser = ctx.state.dbUser;
  if (!dbUser) return;

  const chat = ctx.chat;
  const group =
    chat && (chat.type === "group" || chat.type === "supergroup")
      ? await upsertGroupFromChat(chat)
      : null;
  const groupId = group?.id ?? null;

  const active = await getActiveRideForUser(dbUser.id);
  if (active) {
    if (active.groupId && groupId && active.groupId !== groupId) {
      await ctx.answerCbQuery("Поездка в другой группе").catch(() => {});
      await ctx.reply(
        "У тебя уже активная поездка в другой группе. Заверши её через /stop, затем начни новую.",
      );
      return;
    }
    await ctx.answerCbQuery("У тебя уже есть активная поездка").catch(() => {});
    await ctx.reply("У тебя уже активная поездка — сначала /stop.");
    return;
  }

  await createPendingRide({
    userId: dbUser.id,
    groupId,
    plannedDurationMin: minutes,
  });

  await ctx.answerCbQuery(`Выбрано: ${minutes} мин`).catch(() => {});
  await ctx.reply("Отправь live location в Telegram (кнопка «прикрепить» → Location → Live).");
}
