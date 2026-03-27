import crypto from "crypto";

const TTL_SEC = 15 * 60;

/** Полезная нагрузка токена карты (без exp). */
export type MapViewPayloadSign = { groupId: string | null };

export type MapViewPayload = { exp: number; groupId: string | null };

export function signMapViewPayload(data: MapViewPayloadSign, secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const full: MapViewPayload = { ...data, exp };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Полный URL страницы карты (HTTPS, путь /map/rides). */
export function buildMapPageUrl(baseUrl: string, data: MapViewPayloadSign, secret: string): string {
  const token = signMapViewPayload(data, secret);
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/map/rides?t=${encodeURIComponent(token)}`;
}

export function verifyMapViewToken(token: string, secret: string): MapViewPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const rec = parsed as Record<string, unknown>;
  if (typeof rec.exp !== "number" || rec.exp < Math.floor(Date.now() / 1000)) return null;
  if (!("groupId" in rec) || (rec.groupId !== null && typeof rec.groupId !== "string")) return null;
  return { exp: rec.exp, groupId: rec.groupId as string | null };
}
