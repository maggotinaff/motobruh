import { Router } from "express";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { listActiveRidesForGroup } from "../services/ride.service.js";
import { userDisplayName } from "../utils/display.js";
import { isValidCoordinates } from "../utils/geo.js";
import { verifyMapViewToken } from "../utils/mapViewToken.js";

export const mapRouter = Router();

type MapPoint = { lat: number; lng: number; label: string };

mapRouter.get("/map/rides", async (req, res) => {
  const token = typeof req.query.t === "string" ? req.query.t : "";
  const payload = verifyMapViewToken(token, env.TELEGRAM_WEBHOOK_SECRET);
  if (!payload) {
    res.status(403).type("text/plain; charset=utf-8").send("Ссылка недействительна или истекла. Запроси /who в боте снова.");
    return;
  }

  const rides = await listActiveRidesForGroup(payload.groupId);
  const rideUserIds = new Set(rides.map((r) => r.userId));

  const points: MapPoint[] = rides
    .filter((r) => r.lastLatitude != null && r.lastLongitude != null)
    .map((r) => ({
      lat: r.lastLatitude!,
      lng: r.lastLongitude!,
      label: userDisplayName(r.user),
    }));

  if (payload.viewerUserId && !rideUserIds.has(payload.viewerUserId)) {
    const viewer = await prisma.user.findUnique({ where: { id: payload.viewerUserId } });
    if (
      viewer?.lastKnownLatitude != null &&
      viewer?.lastKnownLongitude != null &&
      isValidCoordinates(viewer.lastKnownLatitude, viewer.lastKnownLongitude)
    ) {
      points.push({
        lat: viewer.lastKnownLatitude,
        lng: viewer.lastKnownLongitude,
        label: userDisplayName(viewer),
      });
    }
  }

  const dataJson = JSON.stringify({ points });
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Карта поездок</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html, body { height: 100%; margin: 0; font-family: system-ui, sans-serif; }
    #map { height: 100%; width: 100%; }
    .hint { position: absolute; z-index: 1000; bottom: 8px; left: 8px; right: 8px; background: rgba(255,255,255,.92); padding: 8px 12px; border-radius: 8px; font-size: 13px; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
    .moto-marker-root { background: transparent !important; border: none !important; }
    .moto-pin-wrap {
      display: flex; flex-direction: column; align-items: center;
      pointer-events: none;
    }
    .moto-pin-name {
      font-size: 12px; font-weight: 600;
      background: rgba(255,255,255,.96);
      padding: 3px 10px; border-radius: 8px;
      box-shadow: 0 1px 6px rgba(0,0,0,.2);
      margin-bottom: 2px; max-width: 180px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      color: #111;
    }
    .moto-pin-emoji {
      font-size: 30px; line-height: 1;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,.35));
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="hint">Метки по последним координатам. Ссылка ~15 минут.</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    const DATA = ${dataJson};
    const map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    const markers = [];
    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }
    function motoIcon(label) {
      const html =
        '<div class="moto-pin-wrap">' +
        '<div class="moto-pin-name">' + esc(label) + '</div>' +
        '<div class="moto-pin-emoji" aria-hidden="true">🏍</div>' +
        '</div>';
      return L.divIcon({
        className: 'moto-marker-root',
        html: html,
        iconSize: [200, 56],
        iconAnchor: [100, 56],
        popupAnchor: [0, -52],
      });
    }
    DATA.points.forEach(function (p) {
      const m = L.marker([p.lat, p.lng], { icon: motoIcon(p.label) }).addTo(map);
      m.bindPopup(esc(p.label));
      markers.push(m);
    });
    if (markers.length === 0) {
      map.setView([55.75, 37.62], 4);
    } else if (markers.length === 1) {
      map.setView([DATA.points[0].lat, DATA.points[0].lng], 13);
    } else {
      const fg = L.featureGroup(markers);
      map.fitBounds(fg.getBounds().pad(0.15));
    }
  </script>
</body>
</html>`;

  res.status(200).type("text/html; charset=utf-8").send(html);
});
