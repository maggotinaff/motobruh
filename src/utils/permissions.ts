import type { ChatMember } from "@telegraf/types";

export function isChatAdmin(status: ChatMember["status"]): boolean {
  return status === "creator" || status === "administrator";
}
