import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { roundCoord } from "../utils/geo.js";
import { fallbackZoneLabel } from "../utils/display.js";
import { logger } from "../utils/logger.js";

const NOMINATIM_TIMEOUT_MS = 4000;

function shortAddressFromNominatim(data: Record<string, unknown>): string | null {
  const addr = data.address as Record<string, string> | undefined;
  if (!addr) return null;
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.city_district;
  const road = addr.road;
  if (city && road) return `${road}, ${city}`;
  if (city) return city;
  if (road) return road;
  const state = addr.state || addr.region;
  if (state && city) return `${city}`;
  if (state) return state;
  return null;
}

export async function resolveZoneLabel(lat: number, lng: number): Promise<string> {
  if (env.DISABLE_REVERSE_GEOCODING) {
    return fallbackZoneLabel(lat, lng);
  }

  const latR = roundCoord(lat, 3);
  const lngR = roundCoord(lng, 3);

  const cached = await prisma.locationCache.findUnique({
    where: { latRounded_lngRounded: { latRounded: latR, lngRounded: lngR } },
  });
  if (cached) return cached.zoneName;

  const base = env.NOMINATIM_BASE_URL.replace(/\/$/, "");
  const url = new URL(`${base}/reverse`);
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "12");
  url.searchParams.set("addressdetails", "1");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "MotobroBot/1.0 (motorcycle group; contact: admin)",
        Accept: "application/json",
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      logger.warn({ status: res.status }, "Nominatim ответил с ошибкой");
      return fallbackZoneLabel(lat, lng);
    }
    const data = (await res.json()) as Record<string, unknown>;
    const label = shortAddressFromNominatim(data) || (typeof data.display_name === "string" ? data.display_name.split(",").slice(0, 2).join(",").trim() : null);
    const zone = label && label.length < 120 ? label : fallbackZoneLabel(lat, lng);

    await prisma.locationCache.upsert({
      where: { latRounded_lngRounded: { latRounded: latR, lngRounded: lngR } },
      create: { latRounded: latR, lngRounded: lngR, zoneName: zone },
      update: { zoneName: zone },
    });

    return zone;
  } catch (e) {
    clearTimeout(t);
    logger.warn({ err: e }, "Геокодирование недоступно, используем запасной подпись");
    return fallbackZoneLabel(lat, lng);
  }
}
