import { Prisma, RideStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ensureGroupSettings } from "./settings.service.js";
import { resolveZoneLabel } from "./geocoding.service.js";
import { haversineKm } from "../utils/distance.js";
import { isValidCoordinates } from "../utils/geo.js";

export async function getActiveRideForUser(userId: string) {
  return prisma.rideSession.findFirst({
    where: { userId, status: RideStatus.ACTIVE },
    include: { group: { include: { settings: true } }, user: true },
    orderBy: { startedAt: "desc" },
  });
}

export async function getPendingRideForUser(userId: string) {
  return prisma.rideSession.findFirst({
    where: { userId, status: RideStatus.PENDING },
    orderBy: { startedAt: "desc" },
  });
}

export async function createPendingRide(input: {
  userId: string;
  groupId: string | null;
  plannedDurationMin: number;
}) {
  const pending = await getPendingRideForUser(input.userId);
  if (pending) {
    return prisma.rideSession.update({
      where: { id: pending.id },
      data: {
        groupId: input.groupId,
        plannedDurationMin: input.plannedDurationMin,
        startedAt: new Date(),
      },
    });
  }
  return prisma.rideSession.create({
    data: {
      userId: input.userId,
      groupId: input.groupId,
      status: RideStatus.PENDING,
      plannedDurationMin: input.plannedDurationMin,
    },
  });
}

export async function stopRideForUser(userId: string) {
  const active = await getActiveRideForUser(userId);
  const pending = active ? null : await getPendingRideForUser(userId);
  const session = active ?? pending;
  if (!session) return { stopped: false as const };

  await prisma.rideSession.update({
    where: { id: session.id },
    data: {
      status: RideStatus.STOPPED,
      endedAt: new Date(),
    },
  });
  return { stopped: true as const, sessionId: session.id };
}

export async function listActiveRidesForGroup(groupId: string | null) {
  const where: Prisma.RideSessionWhereInput = {
    status: RideStatus.ACTIVE,
    lastLocationAt: { not: null },
  };
  if (groupId) {
    where.groupId = groupId;
  }
  return prisma.rideSession.findMany({
    where,
    include: { user: true, group: { include: { settings: true } } },
    orderBy: { lastLocationAt: "desc" },
  });
}

async function inactivityMinutesForRide(ride: {
  groupId: string | null;
  group: { settings: { inactivityTimeoutMin: number } | null } | null;
}): Promise<number> {
  if (ride.group?.settings) return ride.group.settings.inactivityTimeoutMin;
  if (ride.groupId) {
    const gs = await ensureGroupSettings(ride.groupId);
    return gs.inactivityTimeoutMin;
  }
  return 15;
}

export async function expireStaleRides(now: Date = new Date()) {
  const active = await prisma.rideSession.findMany({
    where: { status: RideStatus.ACTIVE },
    include: { group: { include: { settings: true } } },
  });

  let expired = 0;
  for (const ride of active) {
    const timeoutMin = await inactivityMinutesForRide(ride);
    const ms = timeoutMin * 60_000;
    if (!ride.lastLocationAt) {
      if (now.getTime() - ride.startedAt.getTime() > ms) {
        await prisma.rideSession.update({
          where: { id: ride.id },
          data: { status: RideStatus.EXPIRED, endedAt: now },
        });
        expired += 1;
      }
      continue;
    }
    if (now.getTime() - ride.lastLocationAt.getTime() > ms) {
      await prisma.rideSession.update({
        where: { id: ride.id },
        data: { status: RideStatus.EXPIRED, endedAt: now },
      });
      expired += 1;
    }
  }

  const pendingOld = await prisma.rideSession.findMany({
    where: { status: RideStatus.PENDING },
  });
  const pendingMaxAgeMs = 2 * 60 * 60_000;
  for (const ride of pendingOld) {
    if (now.getTime() - ride.startedAt.getTime() > pendingMaxAgeMs) {
      await prisma.rideSession.update({
        where: { id: ride.id },
        data: { status: RideStatus.EXPIRED, endedAt: now },
      });
      expired += 1;
    }
  }

  return expired;
}

export function shouldExpireActiveRide(
  lastLocationAt: Date,
  inactivityTimeoutMin: number,
  now: Date,
): boolean {
  return now.getTime() - lastLocationAt.getTime() > inactivityTimeoutMin * 60_000;
}

export type ApplyLocationResult =
  | { kind: "invalid_coords" }
  | { kind: "one_time"; zone: string; updatedRide: boolean }
  | {
      kind: "live_started";
      zone: string;
      session: NonNullable<Awaited<ReturnType<typeof getActiveRideForUser>>>;
    }
  | {
      kind: "live_update";
      zone: string;
      session: NonNullable<Awaited<ReturnType<typeof getActiveRideForUser>>>;
    }
  | {
      kind: "live_autocreate";
      zone: string;
      announce: boolean;
      session: NonNullable<Awaited<ReturnType<typeof getActiveRideForUser>>>;
    };

export async function applyLocationUpdate(input: {
  userId: string;
  lat: number;
  lng: number;
  isLive: boolean;
  livePeriodSec?: number;
}): Promise<ApplyLocationResult> {
  if (!isValidCoordinates(input.lat, input.lng)) {
    return { kind: "invalid_coords" };
  }

  const zone = await resolveZoneLabel(input.lat, input.lng);
  const now = new Date();

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      lastKnownLatitude: input.lat,
      lastKnownLongitude: input.lng,
      lastKnownAt: now,
      lastKnownZone: zone,
    },
  });

  const active = await getActiveRideForUser(input.userId);
  const pending = active ? null : await getPendingRideForUser(input.userId);

  if (!input.isLive) {
    let updatedRide = false;
    if (active) {
      await prisma.rideSession.update({
        where: { id: active.id },
        data: {
          lastLatitude: input.lat,
          lastLongitude: input.lng,
          lastZone: zone,
          lastLocationAt: now,
        },
      });
      updatedRide = true;
    } else if (pending) {
      await prisma.rideSession.update({
        where: { id: pending.id },
        data: {
          lastLatitude: input.lat,
          lastLongitude: input.lng,
          lastZone: zone,
          lastLocationAt: now,
        },
      });
      updatedRide = true;
    }
    return { kind: "one_time", zone, updatedRide };
  }

  if (pending) {
    const session = await prisma.rideSession.update({
      where: { id: pending.id },
      data: {
        status: RideStatus.ACTIVE,
        lastLatitude: input.lat,
        lastLongitude: input.lng,
        lastZone: zone,
        lastLocationAt: now,
        plannedDurationMin:
          input.livePeriodSec != null ? Math.max(1, Math.round(input.livePeriodSec / 60)) : pending.plannedDurationMin,
      },
      include: { group: { include: { settings: true } }, user: true },
    });
    return { kind: "live_started", zone, session };
  }

  if (active) {
    const session = await prisma.rideSession.update({
      where: { id: active.id },
      data: {
        lastLatitude: input.lat,
        lastLongitude: input.lng,
        lastZone: zone,
        lastLocationAt: now,
      },
      include: { group: { include: { settings: true } }, user: true },
    });
    return { kind: "live_update", zone, session };
  }

  try {
    const session = await prisma.rideSession.create({
      data: {
        userId: input.userId,
        groupId: null,
        status: RideStatus.ACTIVE,
        lastLatitude: input.lat,
        lastLongitude: input.lng,
        lastZone: zone,
        lastLocationAt: now,
        plannedDurationMin:
          input.livePeriodSec != null ? Math.max(1, Math.round(input.livePeriodSec / 60)) : null,
      },
      include: { group: { include: { settings: true } }, user: true },
    });
    return { kind: "live_autocreate", zone, announce: false, session };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await getActiveRideForUser(input.userId);
      if (existing) {
        const session = await prisma.rideSession.update({
          where: { id: existing.id },
          data: {
            lastLatitude: input.lat,
            lastLongitude: input.lng,
            lastZone: zone,
            lastLocationAt: now,
          },
          include: { group: { include: { settings: true } }, user: true },
        });
        return { kind: "live_update", zone, session };
      }
    }
    throw e;
  }
}

export async function findNearbyActiveRiders(input: {
  requesterUserId: string;
  lat: number;
  lng: number;
  radiusKm: number;
  groupId: string | null;
}) {
  const rides = await listActiveRidesForGroup(input.groupId);
  const others = rides.filter(
    (r) =>
      r.userId !== input.requesterUserId &&
      r.lastLatitude != null &&
      r.lastLongitude != null,
  );
  return others
    .map((r) => ({
      ride: r,
      km: haversineKm(input.lat, input.lng, r.lastLatitude!, r.lastLongitude!),
    }))
    .filter((x) => x.km <= input.radiusKm && x.km > 0)
    .sort((a, b) => a.km - b.km);
}

export async function clearUserLocationSnapshot(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastKnownLatitude: null,
      lastKnownLongitude: null,
      lastKnownAt: null,
      lastKnownZone: null,
    },
  });
}
