import type { Chat } from "@telegraf/types";
import { prisma } from "../db/prisma.js";

export async function upsertGroupFromChat(chat: Chat) {
  if (chat.type !== "group" && chat.type !== "supergroup") {
    return null;
  }
  const telegramChatId = BigInt(chat.id);
  const title = "title" in chat ? chat.title ?? null : null;

  const group = await prisma.group.upsert({
    where: { telegramChatId },
    create: {
      telegramChatId,
      title,
      settings: { create: {} },
    },
    update: { title },
    include: { settings: true },
  });

  if (!group.settings) {
    await prisma.groupSettings.create({ data: { groupId: group.id } });
    return prisma.group.findUniqueOrThrow({
      where: { id: group.id },
      include: { settings: true },
    });
  }

  return group;
}

export async function getGroupByTelegramChatId(telegramChatId: bigint) {
  return prisma.group.findUnique({
    where: { telegramChatId },
    include: { settings: true },
  });
}
