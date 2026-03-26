import type { User } from "@prisma/client";

export function userDisplayName(user: Pick<User, "displayName" | "username" | "firstName">): string {
  return user.displayName?.trim() || user.firstName?.trim() || user.username || "Участник";
}

export function fallbackZoneLabel(lat: number, lng: number): string {
  const rLat = lat.toFixed(3);
  const rLng = lng.toFixed(3);
  return `район ${rLat}, ${rLng}`;
}
