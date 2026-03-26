import type { Telegraf } from "telegraf";
import type { MotobroContext } from "../types/bot.js";
import { logger } from "../utils/logger.js";

export async function announceRideStarted(
  bot: Telegraf<MotobroContext>,
  input: {
    groupTelegramChatId: bigint;
    riderDisplayName: string;
    zone: string;
    rideAnnouncementsEnabled: boolean;
    zoneAnnouncementsEnabled: boolean;
  },
): Promise<void> {
  if (!input.rideAnnouncementsEnabled) return;
  const text = input.zoneAnnouncementsEnabled
    ? `${input.riderDisplayName} выехал. Примерный район: ${input.zone}.`
    : `${input.riderDisplayName} выехал.`;
  try {
    await bot.telegram.sendMessage(String(input.groupTelegramChatId), text);
  } catch (e) {
    logger.warn(
      { err: e, chatId: String(input.groupTelegramChatId) },
      "Не удалось отправить объявление о поездке в группу (проверь права бота)",
    );
  }
}
