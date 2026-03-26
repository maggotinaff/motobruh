import type { User as TgUser } from "@telegraf/types";
import { prisma } from "../db/prisma.js";
import { userDisplayName } from "../utils/display.js";

function buildDisplayName(from: TgUser): string {
  const parts = [from.first_name, from.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ").trim();
  if (from.username) return `@${from.username}`;
  return "Участник";
}

export async function upsertTelegramUser(from: TgUser) {
  const telegramUserId = BigInt(from.id);
  const displayName = buildDisplayName(from);

  const user = await prisma.user.upsert({
    where: { telegramUserId },
    create: {
      telegramUserId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      displayName,
      settings: { create: {} },
    },
    update: {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      displayName,
    },
    include: { settings: true },
  });

  if (!user.settings) {
    await prisma.userSettings.create({ data: { userId: user.id } });
    return prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { settings: true },
    });
  }

  return user;
}

export async function getUserByTelegramId(telegramUserId: bigint) {
  return prisma.user.findUnique({
    where: { telegramUserId },
    include: { settings: true },
  });
}

export { userDisplayName };
