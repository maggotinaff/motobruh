import { Router } from "express";
import { env } from "../config/env.js";
import { findNearbyActiveRiders, listActiveRidesForGroup } from "../services/ride.service.js";
import { userDisplayName } from "../utils/display.js";
import { verifyMapViewToken } from "../utils/mapViewToken.js";

export const mapRouter = Router();

mapRouter.get("/map/rides", async (req, res) => {
  const token = typeof req.query.t === "string" ? req.query.t : "";
  const payload = verifyMapViewToken(token, env.TELEGRAM_WEBHOOK_SECRET);
  if (!payload) {
    res.status(403).type("text/plain; charset=utf-8").send("Ссылка недействительна или истекла. Запроси /where или /near в боте снова.");
    return;
  }

  type Point = { lat: number; lng: number; label: string };
  let points: Point[] = [];
  let nearCircle: { lat: number; lng: number; radiusM: number } | null = null;

  if (payload.mode === "where") {
    const rides = await listActiveRidesForGroup(payload.groupId);
    points = rides
      .filter((r) => r.lastLatitude != null && r.lastLongitude != null)
      .map((r) => ({
        lat: r.lastLatitude!,
        lng: r.lastLongitude!,
        label: userDisplayName(r.user),
      }));
  } else {
    const nearby = await findNearbyActiveRiders({
      requesterUserId: payload.requesterUserId,
      lat: payload.lat,
      lng: payload.lng,
      radiusKm: payload.radiusKm,
      groupId: payload.groupId,
    });
    points = [
      { lat: payload.lat, lng: payload.lng, label: "Ты" },
      ...nearby.map((n) => ({
        lat: n.ride.lastLatitude!,
        lng: n.ride.lastLongitude!,
        label: userDisplayName(n.ride.user),
      })),
    ];
    nearCircle = {
      lat: payload.lat,
      lng: payload.lng,
      radiusM: Math.max(50, payload.radiusKm * 1000),
    };
  }

  const dataJson = JSON.stringify({ points, nearCircle });
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
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="hint">Точки по последним координатам в поездке. Ссылка действует ~15 минут.</div>
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
    DATA.points.forEach(function (p) {
      const m = L.marker([p.lat, p.lng]).addTo(map);
      m.bindPopup(esc(p.label));
      markers.push(m);
    });
    if (DATA.nearCircle) {
      L.circle([DATA.nearCircle.lat, DATA.nearCircle.lng], {
        radius: DATA.nearCircle.radiusM,
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.08,
        weight: 2,
      }).addTo(map);
    }
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
