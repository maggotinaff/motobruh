import { prisma } from "../db/prisma.js";

export async function ensureUserSettings(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userSettings.create({ data: { userId } });
}

export async function ensureGroupSettings(groupId: string) {
  const existing = await prisma.groupSettings.findUnique({ where: { groupId } });
  if (existing) return existing;
  return prisma.groupSettings.create({ data: { groupId } });
}
